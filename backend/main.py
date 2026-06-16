from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.database import engine, Base
from app.routes import transacoes, metas

app = FastAPI(title="Razao API", version="1.0.0")

# Permite o frontend conversar com o backend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Cria as tabelas no banco automaticamente
Base.metadata.create_all(bind=engine)

# Rotas
app.include_router(transacoes.router, prefix="/transacoes", tags=["Transacoes"])
app.include_router(metas.router, prefix="/metas", tags=["Metas"])

@app.get("/")
def root():
    return {"status": "Razao API funcionando!"}