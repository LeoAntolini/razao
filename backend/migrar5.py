from app.database import engine
from sqlalchemy import text

with engine.connect() as conn:
    conn.execute(text("""
        ALTER TABLE transacoes 
        ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'confirmado'
    """))
    conn.commit()
    print("Migracao 5 concluida!")