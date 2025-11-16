"""Modelli Pydantic utilizzati per serializzare request e response dell'API."""

from __future__ import annotations

from datetime import datetime
from decimal import Decimal
from typing import List, Optional
from uuid import UUID

from pydantic import BaseModel, Field, HttpUrl


class AccountOut(BaseModel):
    """Rappresenta un conto appartenente all'utente corrente."""

    id: UUID = Field(..., description="Identificativo univoco del conto")
    user_id: UUID = Field(..., description="Identificativo dell'utente proprietario")
    currency: str = Field(..., min_length=3, max_length=3, description="Codice valuta ISO 4217")
    balance: Decimal = Field(..., description="Saldo corrente del conto")
    name: str = Field(..., description="Nome mnemonico del conto")
    created_at: datetime = Field(..., description="Istante di creazione del conto")


class AccountListResponse(BaseModel):
    """Payload di risposta contenente la collezione di conti."""

    data: List[AccountOut]


class AccountTopUpRequest(BaseModel):
    """Richiesta per incrementare il saldo di un conto."""

    amount: Decimal = Field(..., gt=Decimal("0"), description="Importo positivo da accreditare sul conto")


class TransactionOut(BaseModel):
    """Rappresenta una transazione legata a un conto dell'utente."""

    id: UUID = Field(..., description="Identificativo univoco della transazione")
    user_id: UUID = Field(..., description="Identificativo dell'utente proprietario")
    account_id: UUID = Field(..., description="Identificativo del conto coinvolto")
    amount: Decimal = Field(..., description="Importo movimentato dalla transazione")
    currency: str = Field(..., min_length=3, max_length=3, description="Valuta dell'operazione")
    category: Optional[str] = Field(None, description="Categoria opzionale assegnata alla transazione")
    idem_key: str = Field(..., description="Chiave di idempotenza utilizzata per evitare duplicati")
    direction: str = Field(..., description="Direzione della transazione (buy/sell)")
    created_at: datetime = Field(..., description="Istante di creazione della transazione")


class TransactionListResponse(BaseModel):
    """Payload di risposta con una lista di transazioni."""

    data: List[TransactionOut]


class TransactionCreate(BaseModel):
    """Modello di input per la creazione di una nuova transazione simulata."""

    account_id: UUID = Field(..., description="Identificativo del conto interessato")
    amount: Decimal = Field(..., gt=Decimal("0"), description="Importo positivo della transazione")
    currency: str = Field(..., min_length=3, max_length=3, description="Valuta dell'operazione")
    category: Optional[str] = Field(None, max_length=100, description="Categoria opzionale assegnata dall'utente")
    direction: str = Field(..., pattern="^(buy|sell)$", description="Direzione della transazione")
    idem_key: str = Field(..., min_length=1, description="Chiave di idempotenza fornita dal client")


class TransactionResponse(BaseModel):
    """Payload di risposta per singole operazioni sulle transazioni."""

    data: TransactionOut


class WithdrawalMethodCreate(BaseModel):
    """Payload per registrare un metodo di prelievo bancario."""

    account_holder_name: str = Field(..., max_length=140)
    iban: str = Field(..., min_length=15, max_length=34)
    bic: Optional[str] = Field(None, min_length=8, max_length=11)
    bank_name: Optional[str] = Field(None, max_length=140)
    is_default: bool = False


class WithdrawalMethodOut(BaseModel):
    """Dettaglio di un metodo di prelievo salvato."""

    id: UUID
    user_id: UUID
    type: str
    iban: str
    bic: Optional[str]
    bank_name: Optional[str]
    account_holder_name: str
    is_default: bool
    status: str
    created_at: datetime
    verified_at: Optional[datetime]


class WithdrawalRequest(BaseModel):
    """Richiesta di creazione di un prelievo."""

    account_id: UUID
    method_id: UUID
    amount: Decimal = Field(..., gt=Decimal("0.00"))
    currency: str = Field("EUR", min_length=3, max_length=3)


class WithdrawalOut(BaseModel):
    """Dettaglio di una singola richiesta di withdrawal."""

    id: UUID
    user_id: UUID
    method_id: UUID
    account_id: UUID
    amount: Decimal
    fee: Decimal
    currency: str
    total_debit: Decimal
    status: str
    requested_at: datetime
    reference: str


class CryptoPositionOut(BaseModel):
    """Rappresenta una posizione crypto aggregata per l'utente corrente."""

    id: UUID = Field(..., description="Identificativo univoco della posizione")
    ticker: str = Field(..., min_length=1, max_length=12, description="Ticker dell'asset (es. BTC)")
    name: str = Field(..., description="Nome descrittivo dell'asset")
    amount: Decimal = Field(..., ge=Decimal("0"), description="Quantità detenuta")
    eur_value: Decimal = Field(..., description="Valutazione corrente in EUR")
    change_24h_percent: Optional[Decimal] = Field(
        None,
        description="Variazione percentuale rispetto al valore di carico",
    )
    icon_url: Optional[HttpUrl] = Field(
        None, description="URL del logo associato all'asset"
    )
    price_source: Optional[str] = Field(None, description="Provider della quotazione")
    network: Optional[str] = Field(None, description="Blockchain o rete di riferimento")
    account_id: Optional[UUID] = Field(None, description="Conto custodial collegato")
    synced_at: Optional[datetime] = Field(None, description="Ultimo sync andato a buon fine")
    created_at: datetime = Field(..., description="Istante di inserimento della posizione")
    updated_at: datetime = Field(..., description="Istante di ultimo aggiornamento della posizione")


class CryptoPositionListResponse(BaseModel):
    """Elenco delle posizioni crypto con il valore totale aggregato."""

    data: List[CryptoPositionOut]
    total_eur_value: Decimal = Field(..., description="Somma delle valutazioni in EUR")


class CryptoOrderRequest(BaseModel):
    """Richiesta per acquisto/vendita di crypto."""

    account_id: UUID = Field(..., description="Conto da usare per la transazione")
    asset_symbol: str = Field(..., max_length=12, description="Ticker asset (es. BTC)")
    asset_name: str = Field(..., max_length=80, description="Nome descrittivo dell'asset")
    price_eur: Decimal = Field(..., gt=Decimal("0"), description="Prezzo unitario in EUR")
    quantity: Decimal = Field(..., gt=Decimal("0"), description="Quantità da acquistare/vendere")
    side: str = Field(..., pattern="^(buy|sell)$", description="Direzione dell'ordine")


class CryptoOrderResponse(BaseModel):
    """Risposta dopo aver effettuato un ordine crypto."""

    account: AccountOut
    position: Optional[CryptoPositionOut] = None


class OtpSendRequest(BaseModel):
    """Richiesta per l'invio di una OTP."""

    channel_code: Optional[str] = Field(
        default=None, description="Codice canale OTP (es. EMAIL, SMS)."
    )
    destination: Optional[str] = Field(
        default=None, description="Destinazione alternativa (email o numero SMS)."
    )
    metadata: Optional[dict[str, str]] = Field(
        default=None, description="Metadati opzionali inoltrati al servizio OTP."
    )


class OtpSendResponse(BaseModel):
    """Risposta generata dopo aver inviato una OTP."""

    status: str = Field(..., description="Esito dell'invio (es. sent)")
    channel_code: str = Field(..., description="Canale utilizzato per l'invio")
    expires_at: datetime = Field(..., description="Istante di scadenza della OTP")
