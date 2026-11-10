import os
import json
import urllib.request
import urllib.error

def enviar_email(destino: str, assunto: str, html: str) -> bool:
    api_key = os.getenv("BREVO_API_KEY")
    remetente = os.getenv("EMAIL_REMETENTE")

    # Sem credenciais (ambiente local): mostra o e-mail no terminal
    if not api_key or not remetente:
        print(f"\n[EMAIL - MODO DEV] Para: {destino}\nAssunto: {assunto}\n{html}\n")
        return False

    payload = json.dumps({
        "sender": {"name": "Razão", "email": remetente},
        "to": [{"email": destino}],
        "subject": assunto,
        "htmlContent": html,
    }).encode("utf-8")

    req = urllib.request.Request(
        "https://api.brevo.com/v3/smtp/email",
        data=payload,
        method="POST",
        headers={
            "api-key": api_key,
            "content-type": "application/json",
            "accept": "application/json",
        },
    )
    try:
        with urllib.request.urlopen(req, timeout=15) as r:
            return 200 <= r.status < 300
    except urllib.error.HTTPError as e:
        print("Erro Brevo:", e.code, e.read().decode())
    except Exception as e:
        print("Erro ao enviar e-mail:", e)
    return False