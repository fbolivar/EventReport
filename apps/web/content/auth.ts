/** Copy de las pantallas de acceso. */
export const login = {
  title: "Entra a tu informe",
  subtitle:
    "El portal muestra la postura de tu firewall, los hallazgos abiertos y el estado de cumplimiento de tu empresa.",
  emailLabel: "Correo",
  passwordLabel: "Contraseña",
  submit: "Entrar",
  submitting: "Entrando…",
  forgot: "¿Olvidaste tu contraseña?",
  noAccount: "¿Todavía no tienes cuenta? Escríbenos y te enrolamos con tu colector.",
  errors: {
    invalid: "El correo o la contraseña no coinciden. Revisa e intenta de nuevo.",
    unexpected:
      "No pudimos verificar tus datos en este momento. Vuelve a intentarlo en unos segundos.",
    noTenant:
      "Tu cuenta existe pero todavía no está asociada a ninguna empresa. Escríbenos para terminar el enrolamiento.",
  },
} as const;

export const signOut = {
  label: "Cerrar sesión",
} as const;
