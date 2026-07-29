from sqlalchemy import Column, Integer, String, Float, Date, ForeignKey
from app.database import Base

class RendaFixa(Base):
    __tablename__ = "renda_fixa"

    id = Column(Integer, primary_key=True, index=True)
    instituicao = Column(String, nullable=False)
    tipo = Column(String, nullable=False)  # cdb, tesouro, lci, lca, debenture
    valor_investido = Column(Float, nullable=False)
    taxa = Column(String, nullable=True)  # ex: "CDI+2%", "IPCA+5%", "12% a.a."
    tipo_rendimento = Column(String, nullable=True)  # prefixado, cdi, ipca
    data_aplicacao = Column(Date, nullable=False)
    data_vencimento = Column(Date, nullable=True)
    observacao = Column(String, nullable=True)
    usuario_id = Column(Integer, ForeignKey("usuarios.id"), nullable=False)