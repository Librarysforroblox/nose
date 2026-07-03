# ExoCoins — Simulador de apuestas de fútbol (demo)

Sitio 100% ficticio para práctica/portafolio. **No hay dinero real involucrado en ningún momento**: ni pagos, ni retiros, ni conexión con criptomonedas reales. Todo el saldo, las apuestas y los eventos se guardan en `localStorage`, es decir, viven solo en el navegador de cada usuario.

## Qué incluye

- Registro / login (usuarios guardados en `localStorage`)
- 5.000 ExoCoins de bienvenida al crear una cuenta
- Eventos de fútbol simulados con cuotas 1X2
- Boleto de apuestas (simples y combinadas)
- Historial de "Mis apuestas" y Wallet con movimientos
- Panel admin para crear eventos, liquidar resultados (paga automáticamente a los ganadores) y eliminar eventos

## Cuenta admin de prueba

```
usuario: admin
contraseña: admin123
```

Te recomiendo cambiar esta contraseña editando el objeto `seedIfEmpty()` en `app.js` antes de publicar el sitio, sobre todo si alguien más va a poder acceder a la URL.

## Desplegar en Vercel

Es un sitio 100% estático (HTML/CSS/JS sin build), así que el despliegue es directo:

**Opción 1 — CLI**
```bash
npm i -g vercel
cd exocoins
vercel
```

**Opción 2 — Arrastrar y soltar**
Entrá a [vercel.com/new](https://vercel.com/new), elegí "Deploy without Git" y arrastrá la carpeta `exocoins` completa.

**Opción 3 — GitHub**
Subí esta carpeta a un repo y conectalo desde el dashboard de Vercel. No hace falta configurar ningún framework ni build command — Vercel lo detecta como estático automáticamente.

## Limitaciones importantes (léelo antes de compartir el link)

- **No es seguro para producción real**: las contraseñas se guardan en texto plano en `localStorage` del navegador. Cualquiera con acceso a las devtools del navegador puede verlas. Está bien para una demo que vos mismo probás o le mostrás a alguien, pero no lo uses para manejar contraseñas reales de gente.
- **Los datos son por navegador, no compartidos**: si dos personas entran desde dispositivos distintos, cada una tiene su propio localStorage — no ven los mismos eventos ni usuarios entre sí a menos que compartan el mismo navegador/perfil.
- Si más adelante querés que varios usuarios reales compartan los mismos eventos y saldos desde distintos dispositivos, hay que sumar una base de datos real (por ejemplo Vercel Postgres o Supabase) — avisame si querés que lo armemos así.

## Estructura de archivos

```
exocoins/
├── index.html   → estructura de la página (auth + dashboard + admin)
├── style.css    → identidad visual (tema espacial: navy, dorado, cian)
└── app.js       → toda la lógica: auth, eventos, apuestas, wallet, admin
```
