from app.database import engine
from sqlalchemy import text

with engine.connect() as conn:
    # Adiciona coluna subtipo em transacoes
    conn.execute(text("""
        ALTER TABLE transacoes 
        ADD COLUMN IF NOT EXISTS subtipo VARCHAR(50)
    """))
    
    # Adiciona coluna total_parcelas em transacoes
    conn.execute(text("""
        ALTER TABLE transacoes 
        ADD COLUMN IF NOT EXISTS total_parcelas INTEGER
    """))
    
    # Adiciona coluna parcela_atual em transacoes
    conn.execute(text("""
        ALTER TABLE transacoes 
        ADD COLUMN IF NOT EXISTS parcela_atual INTEGER
    """))

    # Adiciona coluna recorrente em transacoes
    conn.execute(text("""
        ALTER TABLE transacoes 
        ADD COLUMN IF NOT EXISTS recorrente BOOLEAN DEFAULT FALSE
    """))

    # Adiciona coluna mes_referencia em transacoes
    conn.execute(text("""
        ALTER TABLE transacoes 
        ADD COLUMN IF NOT EXISTS mes_referencia VARCHAR(7)
    """))

    conn.commit()
    print("Migracao 2 concluida com sucesso!")