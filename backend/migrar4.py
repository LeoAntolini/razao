from app.database import engine
from sqlalchemy import text

with engine.connect() as conn:
    # Cria tabela de usuarios
    conn.execute(text("""
        CREATE TABLE IF NOT EXISTS usuarios (
            id SERIAL PRIMARY KEY,
            nome VARCHAR NOT NULL,
            email VARCHAR UNIQUE NOT NULL,
            senha_hash VARCHAR NOT NULL,
            criado_em TIMESTAMP DEFAULT NOW()
        )
    """))

    # Adiciona usuario_id nas transacoes
    conn.execute(text("""
        ALTER TABLE transacoes
        ADD COLUMN IF NOT EXISTS usuario_id INTEGER REFERENCES usuarios(id)
    """))

    # Adiciona usuario_id nas metas
    conn.execute(text("""
        ALTER TABLE metas
        ADD COLUMN IF NOT EXISTS usuario_id INTEGER REFERENCES usuarios(id)
    """))

    conn.commit()
    print("Migracao 4 concluida com sucesso!")