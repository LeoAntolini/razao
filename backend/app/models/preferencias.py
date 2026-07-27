from sqlalchemy import Column, Integer, Float, ForeignKey
from app.database import Base

class Preferencias(Base):
    __tablename__ = "preferencias"

    id = Column(Integer, primary_key=True, index=True)
    usuario_id = Column(Integer, ForeignKey("usuarios.id"), unique=True, nullable=False)
    pct_investimento = Column(Float, default=60.0)
    pct_lazer = Column(Float, default=25.0)
    pct_gastos = Column(Float, default=15.0)