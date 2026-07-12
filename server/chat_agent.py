import os
import json
import google.generativeai as genai
from typing import Dict, List, Any, Optional
import datetime
import base64
from email.mime.text import MIMEText
from googleapiclient.discovery import build
from google_auth_oauthlib.flow import InstalledAppFlow
from google.oauth2.credentials import Credentials
from google.auth.transport.requests import Request

from email.mime.multipart import MIMEMultipart

# Scopes needed for sending emails
SCOPES = ['https://www.googleapis.com/auth/gmail.send']

# Active session histories: session_id -> list of messages
_session_histories: Dict[str, List[Dict[str, str]]] = {}

def get_session_history(session_id: str) -> List[Dict[str, str]]:
    if session_id not in _session_histories:
        _session_histories[session_id] = []
    return _session_histories[session_id]

def clear_session_history(session_id: str):
    if session_id in _session_histories:
        _session_histories[session_id] = []

def convert_markdown_to_html(md_text: str) -> str:
    import re
    # Convert markdown headers
    html = md_text
    html = re.sub(r'^###\s+(.*?)$', r'<h3 style="color: #00f2fe; margin-top: 20px; margin-bottom: 10px; font-size: 18px;">\1</h3>', html, flags=re.MULTILINE)
    html = re.sub(r'^##\s+(.*?)$', r'<h2 style="color: #00f2fe; margin-top: 25px; margin-bottom: 12px; font-size: 22px;">\1</h2>', html, flags=re.MULTILINE)
    html = re.sub(r'^#\s+(.*?)$', r'<h1 style="color: #00f2fe; margin-top: 30px; margin-bottom: 15px; font-size: 26px;">\1</h1>', html, flags=re.MULTILINE)
    
    # Convert bold
    html = re.sub(r'\*\*(.*?)\*\*', r'<strong style="color: #ffffff;">\1</strong>', html)
    
    # Convert lists
    in_list = False
    lines = html.split('\n')
    new_lines = []
    for line in lines:
        stripped = line.strip()
        if stripped.startswith(('-', '*')):
            if not in_list:
                new_lines.append('<ul style="margin: 15px 0; padding-left: 20px; color: #e5e7eb;">')
                in_list = True
            item_text = stripped[1:].strip()
            new_lines.append(f'<li style="margin-bottom: 8px; line-height: 1.5;">{item_text}</li>')
        else:
            if in_list:
                new_lines.append('</ul>')
                in_list = False
            new_lines.append(line)
    if in_list:
        new_lines.append('</ul>')
    html = '\n'.join(new_lines)
    
    # Convert paragraphs
    paragraphs = html.split('\n\n')
    formatted_paragraphs = []
    for p in paragraphs:
        p_clean = p.strip()
        if not p_clean:
            continue
        if p_clean.startswith(('<ul', '<ol', '<h1', '<h2', '<h3', '<li')):
            formatted_paragraphs.append(p_clean)
        else:
            # Replace inline single newlines with break tags for formatting
            p_br = p_clean.replace("\n", "<br>")
            formatted_paragraphs.append(f'<p style="margin: 0 0 16px 0; line-height: 1.6; color: #e5e7eb;">{p_br}</p>')
            
    html = '\n'.join(formatted_paragraphs)
    return html

def wrap_in_html_template(body_text: str, subject_text: str) -> str:
    formatted_html = convert_markdown_to_html(body_text)
    
    # Extract store name if mentioned or default to CartEngine
    store_name = "CartEngine"
    if "store" in body_text.lower():
        # Quick regex to extract store name if written like "Welcome to [Store Name]"
        match = re.search(r'Welcome to ([A-Za-z0-9\s]+?)(?:\!|\.|\,|\n)', body_text)
        if match:
            store_name = match.group(1).strip()
            
    clean_subject = subject_text.replace("Subject:", "").replace("subject:", "").strip()
    
    html_template = f"""<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>{clean_subject}</title>
  <style>
    @keyframes pulseGlow {{
      0%, 100% {{ box-shadow: 0 0 12px rgba(0, 242, 254, 0.3); }}
      50% {{ box-shadow: 0 0 22px rgba(0, 242, 254, 0.7); }}
    }}
  </style>
</head>
<body style="margin: 0; padding: 0; background-color: #05070f; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; -webkit-font-smoothing: antialiased;">
  <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #05070f; padding: 30px 10px;">
    <tr>
      <td align="center">
        <table border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 600px; background-color: #0d1426; border: 1px solid rgba(255, 255, 255, 0.08); border-radius: 16px; overflow: hidden; box-shadow: 0 10px 30px rgba(0, 0, 0, 0.65);">
          <!-- Header Banner -->
          <tr>
            <td align="center" style="background: linear-gradient(135deg, #00f2fe, #bd00ff); padding: 30px 20px; border-bottom: 1px solid rgba(255, 255, 255, 0.1);">
              <h1 style="margin: 0; font-size: 26px; font-weight: 700; color: #ffffff; letter-spacing: 1.5px; text-transform: uppercase; text-shadow: 0 2px 10px rgba(0, 242, 254, 0.5);">🛒 {store_name}</h1>
              <p style="margin: 5px 0 0 0; font-size: 12px; color: rgba(255, 255, 255, 0.9); font-weight: 600; letter-spacing: 1.5px; text-transform: uppercase;">Personalized Offer Details</p>
            </td>
          </tr>
          <!-- Body Content -->
          <tr>
            <td style="padding: 35px 30px; background-color: #0d1426;">
              <div style="font-size: 15px; color: #e5e7eb;">
                {formatted_html}
              </div>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td align="center" style="padding: 20px; background-color: #060a13; border-top: 1px solid rgba(255, 255, 255, 0.05); font-size: 11px; color: #9ca3af; line-height: 1.5;">
              This email is generated automatically on behalf of <strong>{store_name}</strong> using CartEngine optimization tools.<br>
              Please do not reply directly to this automated email.<br><br>
              © 2026 {store_name} & CartEngine, Inc. All rights reserved.
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
"""
    return html_template

def send_email_tool(recipient: str, subject: str, body: str) -> str:
    """
    Sends a polished customer-facing promotional recovery email containing an auto-generated discount promo code to a customer's email address.
    Authenticates via Gmail OAuth using credentials.json in the workspace root directory.
    If credentials.json is not found, falls back to local logging.
    """
    # 1. Prepare local logging fallback
    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    credentials_path = os.path.join(base_dir, "credentials.json")
    token_path = os.path.join(base_dir, "token.json")
    
    log_file = "sent_emails.log"
    timestamp = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    log_entry = f"""
=========================================
EMAIL ATTEMPT: {timestamp}
TO: {recipient}
SUBJECT: {subject}
-----------------------------------------
BODY:
{body}
=========================================
"""
    
    # Save a local backup log regardless
    try:
        with open(os.path.join(base_dir, log_file), "a", encoding="utf-8") as f:
            f.write(log_entry)
    except Exception:
        pass

    # 2. Gmail API Authentication Flow
    creds = None
    token_env = os.environ.get('GMAIL_TOKEN_JSON')
    
    if token_env:
        try:
            info = json.loads(token_env)
            creds = Credentials.from_authorized_user_info(info, SCOPES)
        except Exception as e:
            print(f"Error parsing GMAIL_TOKEN_JSON environment variable: {str(e)}")
            creds = None
    else:
        if os.path.exists(token_path):
            try:
                creds = Credentials.from_authorized_user_file(token_path, SCOPES)
            except Exception as e:
                print(f"Error loading token.json: {str(e)}")
                creds = None

    # If there are no (valid) credentials available, run OAuth flow or refresh
    if not creds or not creds.valid:
        if creds and creds.expired and creds.refresh_token:
            try:
                creds.refresh(Request())
            except Exception as e:
                print(f"Error refreshing expired credentials: {str(e)}")
                creds = None
        
        if not creds:
            # We must have credentials.json to do initial authorization flow
            if not os.path.exists(credentials_path):
                return (
                    f"Logged report to '{log_file}' because no server token or token.json "
                    f"was found, and 'credentials.json' is missing. Real email could not be sent."
                )
            try:
                # Run local server flow to authenticate
                flow = InstalledAppFlow.from_client_secrets_file(credentials_path, SCOPES)
                creds = flow.run_local_server(port=0, open_browser=True)
                with open(token_path, 'w') as token_file:
                    token_file.write(creds.to_json())
            except Exception as e:
                return (
                    f"Gmail authorization prompt opened on your device. If you cancelled or "
                    f"encountered an issue (Error: {str(e)}), the email has been safely saved to '{log_file}'."
                )

    # 3. Send email using Gmail API (with HTML body and fallback text)
    try:
        service = build('gmail', 'v1', credentials=creds)
        
        message = MIMEMultipart('alternative')
        message['to'] = recipient
        message['subject'] = subject
        
        # Attach plain-text fallback
        part1 = MIMEText(body, 'plain')
        message.attach(part1)
        
        # Attach gorgeous HTML template
        html_content = wrap_in_html_template(body, subject)
        part2 = MIMEText(html_content, 'html')
        message.attach(part2)
        
        # Raw email string needs to be URL-safe Base64 encoded
        raw_message = base64.urlsafe_b64encode(message.as_bytes()).decode('utf-8')
        send_body = {'raw': raw_message}
        
        # Send message
        sent_message = service.users().messages().send(userId='me', body=send_body).execute()
        
        return (
            f"Successfully sent email to {recipient} via Gmail API (Message ID: {sent_message.get('id')}). "
            f"A copy was also saved locally to '{log_file}'."
        )
        
    except Exception as e:
        return (
            f"Authenticated Gmail API successfully, but failed to dispatch the email. "
            f"Error: {str(e)}. The message has been logged locally to '{log_file}'."
        )

# Guardrail domain check
def is_out_of_scope(message: str) -> bool:
    """
    Returns True if the message is clearly out of scope.
    We check for common off-topic keywords.
    """
    off_topic_indicators = [
        "cook", "recipe", "politics", "football", "cricket", "basketball", 
        "movie", "song", "weather", "music", "joke", "sport", "president", 
        "prime minister", "celebrity", "gossip"
    ]
    message_lower = message.lower()
    
    # Simple rule-based check first to ensure absolute guardrail compliance
    for term in off_topic_indicators:
        if term in message_lower:
            # Check if it contains domain terms to avoid false positives
            domain_terms = ["e-commerce", "cart", "abandonment", "discount", "model", "data", "metric", "accuracy", "prediction"]
            has_domain_term = any(dt in message_lower for dt in domain_terms)
            if not has_domain_term:
                return True
    return False

def compile_context_report(
    active_inputs: Optional[Dict[str, Any]] = None,
    active_result: Optional[Dict[str, Any]] = None
) -> str:
    """
    Compiles a highly token-efficient workspace context report.
    Only includes revenue trends, device abandonment rates, and page views correlations.
    Also appends the customer simulator active inputs and results if available.
    """
    models_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "models")
    eda_path = os.path.join(models_dir, "eda_metrics.json")
    
    clean_context = {}
    
    # 1. Add select EDA metrics
    if os.path.exists(eda_path):
        try:
            with open(eda_path, "r") as f:
                eda = json.load(f)
            
            clean_context["device_abandonment_rates"] = eda.get("device_abandonment", {})
            clean_context["monthly_revenue_trends"] = eda.get("monthly_revenue", {})
            
            # Limit page views correlation to reduce token usage
            pv_corr = eda.get("page_views_correlation", [])
            clean_context["page_views_correlation_sample"] = pv_corr[:12] if pv_corr else []
            
            # Simple summary rates
            clean_context["overall_total_sessions"] = eda.get("total_sessions", 0)
            clean_context["overall_cart_abandonment_rate"] = eda.get("cart_abandonment_rate", 0.0)
            
        except Exception:
            pass

    # 2. Add active simulation inputs and outputs
    if active_inputs:
        clean_context["active_customer_simulator_inputs"] = active_inputs
    if active_result:
        # Include optimal discount, cart value, and baseline metrics
        clean_context["active_discount_optimization_results"] = {
            "cart_value": active_result.get("cart_value"),
            "optimal_discount_recommended_percent": active_result.get("optimal_discount"),
            "max_expected_revenue": active_result.get("max_expected_revenue"),
            "baseline_expected_revenue": active_result.get("baseline_expected_revenue"),
            "revenue_lift": active_result.get("revenue_lift")
        }
        
    return json.dumps(clean_context, indent=2)

def search_web_duckduckgo(query: str, max_results: int = 5) -> str:
    """
    Queries DuckDuckGo public HTML interface to fetch organic search results.
    Does not require any API keys.
    """
    import urllib.parse
    import re
    import requests
    import html as html_parser
    
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
    }
    url = f"https://html.duckduckgo.com/html/?q={urllib.parse.quote(query)}"
    try:
        resp = requests.get(url, headers=headers, timeout=10)
        if resp.status_code != 200:
            return f"Web search failed (HTTP {resp.status_code})"
        
        html_text = resp.text
        snippets = re.findall(r'<a class="result__snippet"[^>]*>(.*?)</a>', html_text, re.DOTALL)
        titles = re.findall(r'<a class="result__url"[^>]*>(.*?)</a>', html_text, re.DOTALL)
        
        if not snippets:
            snippets = re.findall(r'<td class="result-snippet"[^>]*>(.*?)</td>', html_text, re.DOTALL)
        if not titles:
            titles = re.findall(r'<a class="result-link"[^>]*>(.*?)</a>', html_text, re.DOTALL)
            
        results = []
        for i in range(min(len(snippets), max_results)):
            snippet = html_parser.unescape(re.sub(r'<[^>]+>', '', snippets[i])).strip()
            title = html_parser.unescape(re.sub(r'<[^>]+>', '', titles[i])).strip() if i < len(titles) else "No Title"
            results.append(f"{i+1}. **{title}**\n   {snippet}")
            
        if not results:
            return "No web search results found. Try a different search query."
            
        return "\n\n".join(results)
    except Exception as e:
        return f"Web search failed to connect: {str(e)}"

def call_openrouter(
    message: str,
    history: List[Dict[str, str]],
    model: str,
    api_key: str,
    system_instruction: str
) -> str:
    import requests
    
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
        "HTTP-Referer": "http://localhost:5173",
        "X-Title": "CartEngine E-Commerce Dashboard"
    }
    
    # Compile messages with system instruction at the top
    messages = [{"role": "system", "content": system_instruction}]
    for msg in history:
        role = "user" if msg["role"] == "user" else "assistant"
        messages.append({"role": role, "content": msg["content"]})
    messages.append({"role": "user", "content": message})
    
    tools_schema = [
        {
            "type": "function",
            "function": {
                "name": "send_email_tool",
                "description": "Sends a polished customer-facing promotional recovery email containing an auto-generated discount promo code to a customer's email address.",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "recipient": {"type": "string", "description": "Recipient email address"},
                        "subject": {"type": "string", "description": "Email subject line"},
                        "body": {"type": "string", "description": "Email body content formatted in markdown"}
                    },
                    "required": ["recipient", "subject", "body"]
                }
            }
        },
        {
            "type": "function",
            "function": {
                "name": "search_web",
                "description": "Searches the internet for general solutions, e-commerce strategies, sales viability, or cart abandonment insights.",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "query": {"type": "string", "description": "The search query to search online"}
                    },
                    "required": ["query"]
                }
            }
        }
    ]
    
    payload = {
        "model": model,
        "messages": messages,
        "tools": tools_schema
    }
    
    try:
        response = requests.post(
            "https://openrouter.ai/api/v1/chat/completions",
            headers=headers,
            json=payload,
            timeout=30
        )
        if response.status_code != 200:
            return f"OpenRouter API Error: {response.status_code} - {response.text}"
            
        data = response.json()
        choice = data["choices"][0]["message"]
        
        # Check if the model triggered a tool call
        if "tool_calls" in choice and choice["tool_calls"]:
            for tool_call in choice["tool_calls"]:
                func = tool_call["function"]
                if func["name"] == "send_email_tool":
                    try:
                        args = json.loads(func["arguments"])
                    except Exception:
                        args = {}
                    tool_result = send_email_tool(
                        recipient=args.get("recipient", ""),
                        subject=args.get("subject", ""),
                        body=args.get("body", "")
                    )
                    return f"**[AI Copilot triggered Email Dispatcher Tool]**\n\n{tool_result}\n\nHere is the report that was attempted to send:\n\n{args.get('body', '')}"
                elif func["name"] == "search_web":
                    try:
                        args = json.loads(func["arguments"])
                    except Exception:
                        args = {}
                    query = args.get("query", "")
                    search_result = search_web_duckduckgo(query)
                    return f"**[AI Copilot triggered Web Search Tool for: *{query}*]**\n\n{search_result}"
        
        return choice.get("content") or "No response content received."
    except Exception as e:
        return f"OpenRouter Connection Error: {str(e)}"

def call_openai(
    message: str,
    history: List[Dict[str, str]],
    model: str,
    api_key: str,
    system_instruction: str
) -> str:
    import requests
    
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json"
    }
    
    messages = [{"role": "system", "content": system_instruction}]
    for msg in history:
        role = "user" if msg["role"] == "user" else "assistant"
        messages.append({"role": role, "content": msg["content"]})
    messages.append({"role": "user", "content": message})
    
    payload = {
        "model": model,
        "messages": messages
    }
    
    try:
        response = requests.post(
            "https://api.openai.com/v1/chat/completions",
            headers=headers,
            json=payload,
            timeout=30
        )
        if response.status_code != 200:
            return f"OpenAI API Error: {response.status_code} - {response.text}"
            
        data = response.json()
        return data["choices"][0]["message"]["content"]
    except Exception as e:
        return f"OpenAI Connection Error: {str(e)}"

def call_nvidia(
    message: str,
    history: List[Dict[str, str]],
    model: str,
    api_key: str,
    system_instruction: str
) -> str:
    import requests
    
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json"
    }
    
    messages = [{"role": "system", "content": system_instruction}]
    for msg in history:
        role = "user" if msg["role"] == "user" else "assistant"
        messages.append({"role": role, "content": msg["content"]})
    messages.append({"role": "user", "content": message})
    
    tools_schema = [
        {
            "type": "function",
            "function": {
                "name": "send_email_tool",
                "description": "Sends a polished customer-facing promotional recovery email containing an auto-generated discount promo code to a customer's email address.",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "recipient": {"type": "string", "description": "Recipient email address"},
                        "subject": {"type": "string", "description": "Email subject line"},
                        "body": {"type": "string", "description": "Email body content formatted in markdown"}
                    },
                    "required": ["recipient", "subject", "body"]
                }
            }
        },
        {
            "type": "function",
            "function": {
                "name": "search_web",
                "description": "Searches the internet for general solutions, e-commerce strategies, sales viability, or cart abandonment insights.",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "query": {"type": "string", "description": "The search query to search online"}
                    },
                    "required": ["query"]
                }
            }
        }
    ]
    
    payload = {
        "model": model,
        "messages": messages,
        "max_tokens": 1024
    }
    
    # Exclude tools for models that don't support them to prevent 400 errors
    if "sarvam" not in model.lower():
        payload["tools"] = tools_schema
    
    try:
        response = requests.post(
            "https://integrate.api.nvidia.com/v1/chat/completions",
            headers=headers,
            json=payload,
            timeout=60
        )
        if response.status_code != 200:
            return f"Nvidia API Error: {response.status_code} - {response.text}"
            
        data = response.json()
        choice = data["choices"][0]["message"]
        
        # Check if the model triggered a tool call
        if "tool_calls" in choice and choice["tool_calls"]:
            for tool_call in choice["tool_calls"]:
                func = tool_call["function"]
                if func["name"] == "send_email_tool":
                    try:
                        args = json.loads(func["arguments"])
                    except Exception:
                        args = {}
                    tool_result = send_email_tool(
                        recipient=args.get("recipient", ""),
                        subject=args.get("subject", ""),
                        body=args.get("body", "")
                    )
                    return f"**[AI Copilot triggered Email Dispatcher Tool]**\n\n{tool_result}\n\nHere is the report that was attempted to send:\n\n{args.get('body', '')}"
                elif func["name"] == "search_web":
                    try:
                        args = json.loads(func["arguments"])
                    except Exception:
                        args = {}
                    query = args.get("query", "")
                    search_result = search_web_duckduckgo(query)
                    return f"**[AI Copilot triggered Web Search Tool for: *{query}*]**\n\n{search_result}"
        
        return choice.get("content") or "No response content received."
    except Exception as e:
        return f"Nvidia Connection Error: {str(e)}"

def generate_key_diagnostic(raw_key: str, cleaned_key: str, provider: str, model: str) -> str:
    has_quotes = raw_key.startswith(("'", '"')) or raw_key.endswith(("'", '"'))
    has_whitespace = raw_key != raw_key.strip()
    length = len(cleaned_key)
    prefix = cleaned_key[:8] if length >= 8 else cleaned_key
    suffix = cleaned_key[-4:] if length >= 4 else ""
    
    report = (
        f"\n\n### 🔍 API Key Diagnostic Report\n"
        f"- **Provider Selected:** `{provider.upper()}`\n"
        f"- **Model Selected:** `{model}`\n"
        f"- **Key Length Received:** `{length}` characters\n"
        f"- **Key Prefix/Suffix:** `{prefix}...{suffix}`\n"
        f"- **Detected Quotes wrapping key:** `{has_quotes}` (Quotes have been automatically stripped)\n"
        f"- **Detected Leading/Trailing Whitespace:** `{has_whitespace}` (Whitespace has been automatically stripped)\n"
    )
    
    if provider == "gemini":
        report += "- **Gemini Check:** Standard Google Gemini API keys are typically **39 characters** long and start with the prefix **`AIzaSy`**. "
        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠️ **Warning: Your key does NOT start with `AIzaSy`.** Please ensure you are copying a Gemini API key from Google AI Studio."
        else:
            report += "✓ Key format matches Gemini pattern. If it still fails, the key might be deactivated, restricted, or expired in Google AI Studio."
            
    elif provider == "openai":
        report += "- **OpenAI Check:** Standard OpenAI API keys typically start with the prefix **`sk-`** and are at least **51 characters** long. "
        if not cleaned_key.startswith("sk-"):
            report += "⚠️ **Warning: Your key does NOT start with `sk-`.** Please ensure you are copying a valid OpenAI API key."
            
    elif provider == "openrouter":
        report += "- **OpenRouter Check:** Standard OpenRouter API keys typically start with the prefix **`sk-or-`** and are about **73 characters** long. "
        if not cleaned_key.startswith("sk-or-"):
            report += "⚠️ **Warning: Your key does NOT start with `sk-or-`.** Please ensure you are copying a valid OpenRouter API key."
            
    elif provider == "nvidia":
        report += "- **Nvidia NIM Check:** Standard Nvidia NIM API keys typically start with the prefix **`nvapi-`**. "
        if not cleaned_key.startswith("nvapi-"):
            report += "⚠️ **Warning: Your key does NOT start with `nvapi-`.** Please ensure you are copying a valid Nvidia NIM API key."
            
    return report

def chat_response(
    message: str,
    session_id: str,
    chat_provider: str = "gemini",
    chat_model: str = "gemini-1.5-flash",
    chat_api_key: str = None,
    active_inputs: Optional[Dict[str, Any]] = None,
    active_result: Optional[Dict[str, Any]] = None
) -> str:
    # 1. Out-of-scope Refusal check
    if is_out_of_scope(message):
        return "I am sorry, but I am guardrailed to only answer questions related to the E-Commerce Cart Abandonment & Targeted Discount Engine workspace."

    # 2. Get API key from parameter or environment
    raw_api_key = chat_api_key
    if not raw_api_key or raw_api_key.strip() == "" or raw_api_key == "dummy":
        if chat_provider == "openrouter":
            raw_api_key = os.environ.get("OPENROUTER_API_KEY")
        elif chat_provider == "openai":
            raw_api_key = os.environ.get("OPENAI_API_KEY")
        elif chat_provider == "nvidia":
            raw_api_key = os.environ.get("NVIDIA_API_KEY")
        else:
            raw_api_key = os.environ.get("GEMINI_API_KEY") or os.environ.get("GOOGLE_API_KEY")

    if not raw_api_key:
        return (
            "API Key is missing. Please configure your API key "
            "in the settings panel of the Copilot drawer to proceed."
        )
        
    api_key = raw_api_key.strip().strip("'\"").strip()
    if not api_key or api_key.lower() in ("undefined", "null", "none", ""):
        return (
            "API Key is empty or invalid. Please configure a valid API key "
            "in the settings panel of the Copilot drawer to proceed."
        )
        
    # Print clean debug log to uvicorn console
    print(f"[API Key Debug] Provider: {chat_provider}, Model: {chat_model}, Key Length: {len(api_key)}, Prefix: {api_key[:8]}...{api_key[-4:] if len(api_key) >= 4 else ''}")
    
    history = get_session_history(session_id)
    system_instruction = f"""
You are the E-Commerce Cart Abandonment & Targeted Discount Engine AI Copilot, an advanced AI development and analysis assistant integrated directly into this application.
Your core purpose is to help the user understand the workspace dataset, the machine learning models trained on it, and the results generated.

Here is the current workspace context (including active evaluation metrics and dataset statistics):
{compile_context_report(active_inputs, active_result)}

CRITICAL SYSTEM INSTRUCTIONS & GUARDRAILS:
1. DOMAIN LIMITATION: You are strictly guardrailed to the scope of this application's domain, which includes machine learning metrics, dataset features, feature extraction/engineering, data visualization, and the specific technology stack of this workspace (E-Commerce, customer behaviors, conversions, targeted discounts, XGBoost classifier, pandas, React, and FastAPI).
2. OUT-OF-SCOPE REFUSAL: You must politely refuse to answer questions that are completely outside this domain (e.g., general cooking, politics, sports, entertainment, or unrelated personal advice). If a query does not pertain to this app or its core domain, you must say exactly:
   "I am sorry, but I am guardrailed to only answer questions related to the E-Commerce Cart Abandonment & Targeted Discount Engine workspace."
3. ALLOW DOMAIN-RELEVANT CONTEXT: You MUST answer secondary, educational, or industry-specific questions that help clarify the workspace content (e.g., explaining performance metrics like F1-score/ROC-AUC, feature importance, cross-validation strategies, preprocessing techniques, or specific model hyper-parameters).
4. CONTEXT AWARENESS: Proactively refer to the active workspace context report provided above. When the user uses conversational pronouns like "this data", "this report", "this prediction", "these metrics", or "these features", you must accurately interpret them using the active context.
5. REQUIRED DISCLAIMER: You must state that you are an AI assistant explaining/interpreting the application's data and model outputs, and you do not represent an absolute production authority or legal diagnostic entity. This system is for research/informational and diagnostic purposes.
6. ZERO-TOLERANCE FOR SPELLING & GRAMMAR ERRORS: You must proofread all responses prior to sending. The tone must be professional, and the text must be free of typos, spelling mistakes, or syntactical errors.
7. STRUCTURED INFORMATION OUTPUT: Do not send walls of unstructured text. Responses must use clean markdown elements: clear sub-headers (###), bold terms, bullet points for lists, and markdown tables for comparisons or metrics.
8. DECISION MATRIX: When discussing model deployment or quality control, propose clear decisions based on severity:
   - "Keep/Fix" if performance metrics (e.g., accuracy, F1) are acceptable but need tuning.
   - "Cut/Discontinue" if metrics are unacceptably low (e.g., accuracy near or below chance level).
9. MITIGATION & QUALITY UPDATES: Offer concrete improvement plans or parameter mitigation tweaks (pricing, data acquisition cost, preprocessing modifications, sensor/feature counts) to compensate for weaknesses identified in the model.
10. COMPETITOR & PIVOT ADVICE: Propose market comparisons and strategic pivots based on high-performing secondary features.
11. AMBIGUITY DETECTION & CLARIFICATION: Detect when user prompts are vague, incomplete, or ambiguous. Instead of guessing or hallucinating details, ask for clarification using structured questions (e.g., bulleted options or simple multiple-choice questions) explaining what specific information is needed and why.
12. PROMOTIONAL EMAIL & PROMO CODES: When the user asks to email a discount to a customer, you MUST generate a warm, polished customer-facing marketing recovery email. You MUST auto-generate a suitable promotional coupon code (e.g. `SAVE10` for 10%, `RECOVER15` for 15%, `OFFER20` for 20%) based on the simulated discount, and embed this promo code inside the email body. You MUST ALSO IMMEDIATELY execute the `send_email_tool` to dispatch this email in the SAME turn. Do not ask for permission or wait for a second prompt; use the tool right away!
    - **STRICT FORBIDDEN CONTENT:** Never include technical model metrics, confusion matrices, dataset statistics, JSON logs, or any internal data structures in the email body sent to the customer.
    - **ADVICE TO E-COMMERCE OWNER:** In your chat response to the owner, explain the best course of action (e.g., that the customer was identified as high-risk, offering a 15% discount has the maximum expected conversion lift, and a recovery email with promo code `SAVE15` has been sent).
"""

    # Route based on provider
    if chat_provider == "nvidia":
        reply = call_nvidia(message, history, chat_model, api_key, system_instruction)
        if "API Error" in reply or "Connection Error" in reply:
            reply += generate_key_diagnostic(raw_api_key, api_key, chat_provider, chat_model)
            return reply
        history.append({"role": "user", "content": message})
        history.append({"role": "model", "content": reply})
        return reply
        
    elif chat_provider == "openrouter":
        reply = call_openrouter(message, history, chat_model, api_key, system_instruction)
        if "API Error" in reply or "Connection Error" in reply:
            reply += generate_key_diagnostic(raw_api_key, api_key, chat_provider, chat_model)
            return reply
        history.append({"role": "user", "content": message})
        history.append({"role": "model", "content": reply})
        return reply
        
    elif chat_provider == "openai":
        reply = call_openai(message, history, chat_model, api_key, system_instruction)
        if "API Error" in reply or "Connection Error" in reply:
            reply += generate_key_diagnostic(raw_api_key, api_key, chat_provider, chat_model)
            return reply
        history.append({"role": "user", "content": message})
        history.append({"role": "model", "content": reply})
        return reply
        
    else: # Google Gemini SDK
        try:
            genai.configure(api_key=api_key)
        except Exception as e:
            return f"Error configuring Gemini SDK: {str(e)}" + generate_key_diagnostic(raw_api_key, api_key, chat_provider, chat_model)

        # Convert history into Gemini SDK format
        contents = []
        for msg in history:
            role = "user" if msg["role"] == "user" else "model"
            contents.append({"role": role, "parts": [msg["content"]]})
            
        contents.append({"role": "user", "parts": [message]})

        try:
            model = genai.GenerativeModel(
                model_name=chat_model,
                system_instruction=system_instruction,
                tools=[send_email_tool]
            )
            
            chat = model.start_chat(history=contents[:-1])
            response = chat.send_message(message)
            
            # Check if model wants to call a tool
            if response.function_calls:
                for call in response.function_calls:
                    if call.name == "send_email_tool":
                        args = call.args
                        tool_result = send_email_tool(
                            recipient=args.get("recipient", ""),
                            subject=args.get("subject", ""),
                            body=args.get("body", "")
                        )
                        final_response = f"**[AI Copilot triggered Email Dispatcher Tool]**\n\n{tool_result}\n\nHere is the report that was attempted to send:\n\n{args.get('body', '')}"
                        
                        history.append({"role": "user", "content": message})
                        history.append({"role": "model", "content": final_response})
                        return final_response
                        
            text_resp = response.text
            history.append({"role": "user", "content": message})
            history.append({"role": "model", "content": text_resp})
            return text_resp
            
        except Exception as e:
            # Fallback to simple completion without system instructions or tools
            try:
                model = genai.GenerativeModel(chat_model)
                prompt = f"{system_instruction}\n\nUser Message: {message}\nAssistant:"
                response = model.generate_content(prompt)
                text_resp = response.text
                
                history.append({"role": "user", "content": message})
                history.append({"role": "model", "content": text_resp})
                return text_resp
            except Exception as inner_e:
                error_msg = f"Gemini API Error: {str(e)} | Inner Error: {str(inner_e)}"
                error_msg += generate_key_diagnostic(raw_api_key, api_key, chat_provider, chat_model)
                return error_msg

def generate_copywriter_text(
    prompt: str,
    provider: str,
    model: str,
    api_key: str
) -> str:
    cleaned_key = api_key.strip().strip("'\"").strip()
    
    if provider == "openrouter":
        system_instruction = "You are a creative e-commerce copywriter. Generate marketing copy based on parameters."
        return call_openrouter(prompt, [], model, cleaned_key, system_instruction)
        
    elif provider == "nvidia":
        system_instruction = "You are a creative e-commerce copywriter. Generate marketing copy based on parameters."
        return call_nvidia(prompt, [], model, cleaned_key, system_instruction)
        
    elif provider == "openai":
        system_instruction = "You are a creative e-commerce copywriter. Generate marketing copy based on parameters."
        return call_openai(prompt, [], model, cleaned_key, system_instruction)
        
    else:  # gemini
        try:
            genai.configure(api_key=cleaned_key)
            model_obj = genai.GenerativeModel(model)
            response = model_obj.generate_content(prompt)
            return response.text
        except Exception as e:
            raise Exception(f"Gemini generation error: {str(e)}")

