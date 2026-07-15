from app.database import engine
from sqlalchemy import text

with engine.connect() as conn:
    # Adiciona coluna meta_id na tabela transacoes
    conn.execute(text("""
        ALTER TABLE transacoes 
        ADD COLUMN IF NOT EXISTS meta_id INTEGER
    """))
    
    # Adiciona o valor 'investimento' no enum existente
    conn.execute(text("""
        ALTER TYPE tipotransacao ADD VALUE IF NOT EXISTS 'investimento'
    """))
    
    conn.commit()
    print("Migracao concluida com sucesso!")