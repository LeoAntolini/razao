from app.database import engine
from sqlalchemy import text

with engine.connect() as conn:
    # Adiciona coluna status nas metas
    conn.execute(text("""
        ALTER TABLE metas 
        ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'ativa'
    """))
    
    # Adiciona coluna data_conclusao nas metas
    conn.execute(text("""
        ALTER TABLE metas 
        ADD COLUMN IF NOT EXISTS data_conclusao DATE
    """))

    # Adiciona coluna data_encerramento nas metas
    conn.execute(text("""
        ALTER TABLE metas 
        ADD COLUMN IF NOT EXISTS data_encerramento DATE
    """))

    # Adiciona coluna motivo_encerramento nas metas
    conn.execute(text("""
        ALTER TABLE metas 
        ADD COLUMN IF NOT EXISTS motivo_encerramento VARCHAR(50)
    """))

    conn.commit()
    print("Migracao 3 concluida com sucesso!")