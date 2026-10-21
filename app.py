import streamlit as st
import requests
import os

st.set_page_config(page_title="B2B Ad Generator", layout="wide")

st.title("🚀 AI B2B Ad Creative Generator")
st.markdown("Enter a business URL, and our agent will research the company and generate a ready-to-publish image ad.")

API_URL = os.getenv("API_URL", "http://localhost:8000/generate")

url_input = st.text_input("Business Website URL", placeholder="https://www.stripe.com")

if st.button("Generate Ad creatives", type="primary"):
    if not url_input:
        st.warning("Please enter a URL")
    else:
        with st.spinner("Agent is reading website and generating graphics..."):
            try:
                # Call our FastAPI backend
                response = requests.post(API_URL, json={"url": url_input}, timeout=60)
                response.raise_for_status()
                data = response.json()
                
                strategy = data["strategy"]
                img_b64 = data["image_base64"]
                
                st.success("Ad Generated Successfully!")
                
                col1, col2 = st.columns(2)
                
                with col1:
                    st.subheader("📊 Business Profile & Strategy")
                    st.write(f"**Company:** {strategy['company_name']}")
                    st.write(f"**Target Audience:** {strategy['target_audience']}")
                    st.write(f"**Generated Headline:** {strategy['ad_headline']}")
                    st.write(f"**Primary Text:** {strategy['ad_subtext']}")
                    
                with col2:
                    st.subheader("🖼️ Generated Image Creative (1080x1080)")
                    st.image(img_b64, caption=f"Format: LinkedIn / Meta Square")
                    
            except requests.HTTPError as exc:
                detail = exc.response.text if exc.response is not None else str(exc)
                st.error(f"Ad generation failed: {detail}")
            except requests.RequestException as exc:
                st.error(f"Cannot reach the ad service: {exc}")
            except (KeyError, ValueError) as exc:
                st.error(f"The ad service returned an invalid response: {exc}")