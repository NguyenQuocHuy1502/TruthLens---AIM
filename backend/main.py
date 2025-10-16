from fastapi import FastAPI, HTTPException # indicating the main api which is FastAPI and the import is to find the errors
from fastapi.middleware.cors import CORSMiddleware # for handling CORS requests from frontend
from pydantic import BaseModel # this checks the data to make sure its valid and it will be sent back to the application
import requests # this import statement is letting us use the external api in this program
import re # for text processing and pattern matching

# this line creates the web application and it uses FastAPI
app = FastAPI()

# Add CORS middleware to allow frontend requests
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, specify exact origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# this is the link to the external api
# in this case it is 'sapling' but it will be changed to GPTZero later
api_link = "https://api.sapling.ai/api/v1/aidetect"

# this is the bearer key
# the purpose of this is for authorization
api_private_key = "L5GO02U1QNW2WNTAGDUZV3Q705OPMUP6"

# text model that is received from the user
# this will be used for input validation
class TextFromFrontEnd(BaseModel):
   text: str # setting this variable to 'None' is not necessary, this can be removed if needed

# product analysis model for comprehensive product data
class ProductAnalysis(BaseModel):
    title: str
    description: str = ""
    price: str = ""
    seller: str = ""
    rating: str = ""
    reviews_count: str = ""
    url: str = ""

# this is sending the post request to '/check-text'
@app.post("/check-text")
# function that is taking the text from front-end and checking it
def check_ai_text(item: TextFromFrontEnd):
   # this is a header and it includes the api key with it
   authorize = {"Authorization": f"Key {api_private_key}"}
  
   # this is sending the information to the external api (in this cause sapling)
   dataSent = {"text": item.text}

   # not necessary to check for error but makes the program better
   # this will catch issues like invalid api key, no internet, etc.
   try: 
       # this sends the request to the external api (in this case, it is sapling)
       response = requests.post(api_link, headers=authorize, json=dataSent)
       # this line is going to check for the actual errors
       response.raise_for_status()
   except requests.exceptions.RequestException as e:
       # this will return the HTTP error with information on the error if this part goes through
       raise HTTPException(status_code=500, detail=f"API error: {str(e)}")
  
   # this is returning back the results to the front-end that was examined by the external api (which ever one choose)
   return response.json()

# Helper function to analyze product legitimacy based on multiple factors
def analyze_product_legitimacy(product_data: ProductAnalysis) -> dict:
    """
    Analyze product legitimacy based on various factors
    Returns: {'status': 'legit'|'scam'|'uncertain', 'confidence': float, 'reasons': list}
    """
    reasons = []
    scam_indicators = 0
    legit_indicators = 0
    
    # Check title for suspicious patterns
    title_lower = product_data.title.lower()
    suspicious_words = ['urgent', 'limited time', 'act now', 'guaranteed', 'miracle', 'secret', 'exclusive offer']
    if any(word in title_lower for word in suspicious_words):
        scam_indicators += 1
        reasons.append("Suspicious language in title")
    
    # Check price patterns
    if product_data.price:
        try:
            # Extract numeric price
            price_match = re.search(r'[\d,]+\.?\d*', product_data.price.replace('$', '').replace(',', ''))
            if price_match:
                price_value = float(price_match.group())
                # Very low prices can be suspicious
                if price_value < 1.0:
                    scam_indicators += 1
                    reasons.append("Unusually low price")
                elif price_value > 1000:
                    legit_indicators += 1
                    reasons.append("Reasonable price range")
        except:
            pass
    
    # Check seller information
    if product_data.seller:
        seller_lower = product_data.seller.lower()
        if 'amazon' in seller_lower or 'walmart' in seller_lower or 'target' in seller_lower:
            legit_indicators += 1
            reasons.append("Reputable seller")
        elif len(seller_lower) < 3 or seller_lower.isdigit():
            scam_indicators += 1
            reasons.append("Suspicious seller name")
    
    # Check rating patterns
    if product_data.rating:
        try:
            rating_value = float(product_data.rating)
            if rating_value < 2.0:
                scam_indicators += 1
                reasons.append("Very low rating")
            elif rating_value > 4.0:
                legit_indicators += 1
                reasons.append("Good rating")
        except:
            pass
    
    # Check reviews count
    if product_data.reviews_count:
        try:
            reviews_match = re.search(r'[\d,]+', product_data.reviews_count.replace(',', ''))
            if reviews_match:
                reviews_value = int(reviews_match.group())
                if reviews_value < 5:
                    scam_indicators += 1
                    reasons.append("Very few reviews")
                elif reviews_value > 100:
                    legit_indicators += 1
                    reasons.append("Many reviews")
                elif reviews_value > 20:
                    legit_indicators += 0.5  # Partial credit for moderate reviews
                    reasons.append("Moderate number of reviews")
        except:
            pass
    
    # Check title length and quality
    if product_data.title:
        title_length = len(product_data.title)
        if title_length < 10:
            scam_indicators += 1
            reasons.append("Very short product title")
        elif title_length > 100:
            scam_indicators += 0.5
            reasons.append("Unusually long product title")
        elif 20 <= title_length <= 80:
            legit_indicators += 0.5
            reasons.append("Appropriate title length")
    
    # Check for missing critical information
    missing_info_count = 0
    if not product_data.price:
        missing_info_count += 1
    if not product_data.rating:
        missing_info_count += 1
    if not product_data.reviews_count:
        missing_info_count += 1
    
    if missing_info_count >= 2:
        scam_indicators += 1
        reasons.append("Missing critical product information")
    elif missing_info_count == 0:
        legit_indicators += 0.5
        reasons.append("Complete product information available")
    
    # Determine final status
    total_indicators = scam_indicators + legit_indicators
    
    if scam_indicators > legit_indicators and scam_indicators >= 2:
        status = 'scam'
        confidence = min(0.9, 0.5 + (scam_indicators * 0.1))
    elif legit_indicators > scam_indicators and legit_indicators >= 2:
        status = 'legit'
        confidence = min(0.9, 0.5 + (legit_indicators * 0.1))
    else:
        status = 'uncertain'
        # Calculate confidence based on available indicators and data quality
        if total_indicators == 0:
            confidence = 0.3  # Low confidence when no indicators found
        else:
            # Base confidence on the ratio of stronger indicators
            stronger_indicators = max(scam_indicators, legit_indicators)
            confidence = 0.4 + (stronger_indicators * 0.1)  # Range: 0.4 to 0.7
    
    return {
        'status': status,
        'confidence': confidence,
        'reasons': reasons,
        'indicators': {
            'scam_indicators': scam_indicators,
            'legit_indicators': legit_indicators
        }
    }

# New endpoint for product analysis
@app.post("/analyze-product")
def analyze_product(product_data: ProductAnalysis):
    """
    Analyze a product for legitimacy using multiple factors
    """
    try:
        # First, analyze using our custom logic
        analysis_result = analyze_product_legitimacy(product_data)
        
        # Also run AI detection on the combined text
        combined_text = f"{product_data.title} {product_data.description}"
        if combined_text.strip():
            try:
                authorize = {"Authorization": f"Key {api_private_key}"}
                data_sent = {"text": combined_text}
                
                ai_response = requests.post(api_link, headers=authorize, json=data_sent)
                ai_response.raise_for_status()
                ai_result = ai_response.json()
                
                # Combine AI analysis with our analysis
                analysis_result['ai_analysis'] = ai_result
                
                # Adjust confidence based on AI results
                if 'score' in ai_result:
                    ai_score = ai_result.get('score', 0.5)
                    # If AI detects AI-generated content, increase scam likelihood
                    if ai_score > 0.7:  # High AI probability
                        if analysis_result['status'] == 'legit':
                            analysis_result['status'] = 'uncertain'
                            analysis_result['confidence'] = max(0.3, analysis_result['confidence'] - 0.2)
                        analysis_result['reasons'].append("AI-generated content detected")
                
            except requests.exceptions.RequestException as e:
                # If AI analysis fails, continue with our analysis
                analysis_result['ai_error'] = str(e)
        
        return {
            'success': True,
            'analysis': analysis_result,
            'product_info': {
                'title': product_data.title,
                'url': product_data.url
            }
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Analysis error: {str(e)}")