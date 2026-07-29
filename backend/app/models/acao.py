from sqlalchemy import Column, Integer, String, Float, Date, ForeignKey
from sqlalchemy.orm import relationship
from app.database import Base

class Acao(Base):
    __tablename__ = "acoes"

    id = Column(Integer, primary_key=True, index=True)
    ticker = Column(String, nullable=False)
    tipo = Column(String, nullable=False, default="acao")  # acao, fii, etf, bdr
    quantidade = Column(Float, nullable=False)
    preco_pago = Column(Float, nullable=False)
    data_compra = Column(Date, nullable=False)
    corretora = Column(String, nullable=True)
    observacao = Column(String, nullable=True)
    usuario_id = Column(Integer, ForeignKey("usuarios.id"), nullable=False)