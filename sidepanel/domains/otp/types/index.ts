export type OtpStatusType = 'error' | 'success'

export interface OtpCode {
  id: string
  name: string
  secret: string
  code: string
}
