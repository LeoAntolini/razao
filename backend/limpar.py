from app.database import engine
from sqlalchemy import text

with engine.connect() as conn:
    # Desativa verificação de chaves estrangeiras temporariamente
    conn.execute(text("TRUNCATE TABLE transacoes RESTART IDENTITY CASCADE"))
    conn.execute(text("TRUNCATE TABLE metas RESTART IDENTITY CASCADE"))
    conn.commit()
    print("Banco de dados limpo com sucesso!")