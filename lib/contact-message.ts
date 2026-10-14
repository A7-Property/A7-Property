/** The existing message API stores the reply preference in the message itself. */
export function composeContactMessage(message: string, phoneRequested: boolean, phonePreference: string) {
  const body = message.trim();
  return phoneRequested ? `${body}\n\n${phonePreference}` : body;
}
