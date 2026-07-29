# Banco custodiante por ticker — dados públicos B3
# Formato: TICKER: (nome_banco, cnpj)

CUSTODIANTES = {
    # Petrobras
    "PETR3": ("Banco Bradesco S.A.", "60.746.948/0001-12"),
    "PETR4": ("Banco Bradesco S.A.", "60.746.948/0001-12"),
    # Banco do Brasil
    "BBAS3": ("Banco do Brasil S.A.", "00.000.000/0001-91"),
    # Itaú
    "ITUB3": ("Itaú Unibanco S.A.", "60.701.190/0001-04"),
    "ITUB4": ("Itaú Unibanco S.A.", "60.701.190/0001-04"),
    "ITSA3": ("Itaú Unibanco S.A.", "60.701.190/0001-04"),
    "ITSA4": ("Itaú Unibanco S.A.", "60.701.190/0001-04"),
    # Bradesco
    "BBDC3": ("Banco Bradesco S.A.", "60.746.948/0001-12"),
    "BBDC4": ("Banco Bradesco S.A.", "60.746.948/0001-12"),
    # Vale
    "VALE3": ("Banco Bradesco S.A.", "60.746.948/0001-12"),
    # Ambev
    "ABEV3": ("Banco Bradesco S.A.", "60.746.948/0001-12"),
    # Magazine Luiza
    "MGLU3": ("Banco Bradesco S.A.", "60.746.948/0001-12"),
    # Americanas
    "AMER3": ("Banco Bradesco S.A.", "60.746.948/0001-12"),
    # WEG
    "WEGE3": ("Banco Bradesco S.A.", "60.746.948/0001-12"),
    # Localiza
    "RENT3": ("Banco Bradesco S.A.", "60.746.948/0001-12"),
    # BTG Pactual
    "BPAC11": ("Banco BTG Pactual S.A.", "30.306.294/0001-45"),
    # XP Inc
    "XPBR31": ("XP Investimentos S.A.", "02.332.886/0001-04"),
    # Embraer
    "EMBR3": ("Banco Bradesco S.A.", "60.746.948/0001-12"),
    # Suzano
    "SUZB3": ("Banco Bradesco S.A.", "60.746.948/0001-12"),
    # Equatorial
    "EQTL3": ("Banco Bradesco S.A.", "60.746.948/0001-12"),
    # Eneva
    "ENEV3": ("Banco Bradesco S.A.", "60.746.948/0001-12"),
    # Copel
    "CPLE6": ("Banco Bradesco S.A.", "60.746.948/0001-12"),
    # Cemig
    "CMIG4": ("Banco Bradesco S.A.", "60.746.948/0001-12"),
    # Eletrobras
    "ELET3": ("Banco Bradesco S.A.", "60.746.948/0001-12"),
    "ELET6": ("Banco Bradesco S.A.", "60.746.948/0001-12"),
    # Sabesp
    "SBSP3": ("Banco Bradesco S.A.", "60.746.948/0001-12"),
    # Hapvida
    "HAPV3": ("Banco Bradesco S.A.", "60.746.948/0001-12"),
    # Rede D'Or
    "RDOR3": ("Banco Bradesco S.A.", "60.746.948/0001-12"),
    # Multiplan
    "MULT3": ("Banco Bradesco S.A.", "60.746.948/0001-12"),
    # CSAN
    "CSAN3": ("Banco Bradesco S.A.", "60.746.948/0001-12"),
    # Raizen
    "RAIZ4": ("Banco Bradesco S.A.", "60.746.948/0001-12"),
    # Vivara
    "VIVA3": ("Banco Bradesco S.A.", "60.746.948/0001-12"),
    # Track & Field
    "TFCO4": ("Banco Bradesco S.A.", "60.746.948/0001-12"),
    # FIIs mais comuns
    "HGLG11": ("BTG Pactual S.A.", "30.306.294/0001-45"),
    "KNRI11": ("Banco BTG Pactual S.A.", "30.306.294/0001-45"),
    "XPML11": ("XP Investimentos S.A.", "02.332.886/0001-04"),
    "VISC11": ("XP Investimentos S.A.", "02.332.886/0001-04"),
    "HGBS11": ("BTG Pactual S.A.", "30.306.294/0001-45"),
    "BCFF11": ("Banco BTG Pactual S.A.", "30.306.294/0001-45"),
    "MXRF11": ("Banco BTG Pactual S.A.", "30.306.294/0001-45"),
    "IFIX11": ("BlackRock Brasil", "13.165.882/0001-01"),
    # ETFs
    "BOVA11": ("BlackRock Brasil", "13.165.882/0001-01"),
    "SMAL11": ("BlackRock Brasil", "13.165.882/0001-01"),
    "IVVB11": ("BlackRock Brasil", "13.165.882/0001-01"),
    "SPY11": ("BlackRock Brasil", "13.165.882/0001-01"),
}

def get_custodiante(ticker: str):
    ticker = ticker.upper().strip()
    if ticker in CUSTODIANTES:
        nome, cnpj = CUSTODIANTES[ticker]
        return {"nome": nome, "cnpj": cnpj, "encontrado": True}
    return {"nome": "Não encontrado", "cnpj": "", "encontrado": False}