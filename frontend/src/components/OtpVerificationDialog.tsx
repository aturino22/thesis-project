import { useEffect, useState } from 'react'
import {
  Alert,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  TextField,
  Typography,
} from '@mui/material'
import { useOtpSendMutation, useOtpVerifyMutation } from '@/api/hooks'

type OtpVerificationDialogProps = {
  open: boolean
  onClose: () => void
  context?: string
  autoFocus?: boolean
  onVerified?: (sessionExpiresAt: string) => void
}

export function OtpVerificationDialog({
  open,
  onClose,
  context = 'default',
  autoFocus = true,
  onVerified,
}: OtpVerificationDialogProps) {
  const otpSend = useOtpSendMutation()
  const otpVerify = useOtpVerifyMutation()
  const [challengeId, setChallengeId] = useState<string | null>(null)
  const [challengeExpiresAt, setChallengeExpiresAt] = useState<string | null>(null)
  const [code, setCode] = useState('')
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null)

  useEffect(() => {
    if (!open) {
      setChallengeId(null)
      setChallengeExpiresAt(null)
      setCode('')
      setFeedback(null)
    }
  }, [open])

  const handleSend = async () => {
    setFeedback(null)
    try {
      const response = await otpSend.mutateAsync({ context })
      setChallengeId(response.challengeId)
      setChallengeExpiresAt(response.expiresAt)
      setCode('')
      setFeedback({
        type: 'success',
        message:
          response.channelCode === 'EMAIL'
            ? 'Codice inviato all’indirizzo email registrato.'
            : `Codice inviato tramite ${response.channelCode}.`,
      })
    } catch (error) {
      setFeedback({
        type: 'error',
        message: error instanceof Error ? error.message : 'Invio OTP non riuscito. Riprova più tardi.',
      })
    }
  }

  const handleVerify = async () => {
    if (!challengeId) {
      setFeedback({ type: 'error', message: 'Richiedi prima un codice OTP.' })
      return
    }
    if (!code.trim()) {
      setFeedback({ type: 'error', message: 'Inserisci il codice ricevuto via email.' })
      return
    }
    setFeedback(null)
    try {
      const response = await otpVerify.mutateAsync({ challengeId, code: code.trim() })
      setFeedback({
        type: 'success',
        message: 'Verifica completata con successo.',
      })
      onVerified?.(response.expiresAt)
      onClose()
    } catch (error) {
      setFeedback({
        type: 'error',
        message: error instanceof Error ? error.message : 'Codice non valido o scaduto.',
      })
    }
  }

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="xs">
      <DialogTitle>Verifica tramite OTP</DialogTitle>
      <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
        <Typography variant="body2" color="text.secondary">
          Invia un codice monouso via email e inseriscilo per completare la Strong Customer Authentication.
        </Typography>
        <Alert severity="warning" variant="outlined">
          Demo: qualsiasi codice numerico inserito verra accettato e il controllo OTP e simulato.
        </Alert>
        <Button variant="outlined" onClick={handleSend} disabled={otpSend.isPending}>
          {otpSend.isPending ? 'Invio...' : 'Invia codice via email'}
        </Button>
        <TextField
          autoFocus={autoFocus}
          label="Codice OTP"
          size="small"
          fullWidth
          value={code}
          onChange={(event) => setCode(event.target.value)}
          disabled={otpVerify.isPending}
        />
        {challengeExpiresAt ? (
          <Typography variant="caption" color="text.secondary">
            Codice valido fino al {new Date(challengeExpiresAt).toLocaleString('it-IT')}.
          </Typography>
        ) : null}
        {feedback ? (
          <Alert severity={feedback.type} variant="outlined">
            {feedback.message}
          </Alert>
        ) : null}
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose} disabled={otpSend.isPending || otpVerify.isPending}>
          Chiudi
        </Button>
        <Button variant="contained" onClick={handleVerify} disabled={otpVerify.isPending}>
          {otpVerify.isPending ? 'Verifica in corso...' : 'Verifica'}
        </Button>
      </DialogActions>
    </Dialog>
  )
}
