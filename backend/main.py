from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.database import engine, Base
from app.models import transacao, meta, gasto_fixo, usuario, preferencias, acao, renda_fixa, reset_senha
from app.routes import transacoes, metas, gastos_fixos, auth
from app.routes import preferencias as pref_routes
from app.routes import acoes, renda_fixa as rf_routes, ir, recuperacao

app = FastAPI(title="Razao API", version="4.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

Base.metadata.create_all(bind=engine)

app.include_router(auth.router, prefix="/auth", tags=["Auth"])
app.include_router(recuperacao.router, prefix="/auth", tags=["Recuperacao de senha"])
app.include_router(transacoes.router, prefix="/transacoes", tags=["Transacoes"])
app.include_router(metas.router, prefix="/metas", tags=["Metas"])
app.include_router(gastos_fixos.router, prefix="/gastos-fixos", tags=["Gastos Fixos"])
app.include_router(pref_routes.router, prefix="/preferencias", tags=["Preferencias"])
app.include_router(acoes.router, prefix="/acoes", tags=["Acoes"])
app.include_router(rf_routes.router, prefix="/renda-fixa", tags=["Renda Fixa"])
app.include_router(ir.router, prefix="/ir", tags=["Imposto de Renda"])

@app.get("/")
def root():
    return {"status": "Razao API v4.0 funcionando!"}