from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.database import engine, Base
from app.models import transacao, meta, gasto_fixo, usuario
from app.routes import transacoes, metas, gastos_fixos
from app.routes import auth

app = FastAPI(title="Razao API", version="3.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

Base.metadata.create_all(bind=engine)

app.include_router(auth.router, prefix="/auth", tags=["Auth"])
app.include_router(transacoes.router, prefix="/transacoes", tags=["Transacoes"])
app.include_router(metas.router, prefix="/metas", tags=["Metas"])
app.include_router(gastos_fixos.router, prefix="/gastos-fixos", tags=["Gastos Fixos"])

@app.get("/")
def root():
    return {"status": "Razao API v3.0 funcionando!"}