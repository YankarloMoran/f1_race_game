# 🏁 F1 Grand Prix 3D Simulator 🏎️

¡Bienvenido al Simulador 3D de Fórmula 1! Este es un juego interactivo en 3D desarrollado con **Three.js** y **Vite** que simula la experiencia de conducir un monoplaza de F1 en algunos de los circuitos más icónicos del mundo.

---

## 🛠️ Requisitos Previos

Para que otra persona pueda ejecutar y probar este proyecto en su máquina, necesita tener instalado:

1. **Node.js** (Versión LTS recomendada, 18.x o superior).
   * Se puede descargar gratis desde [nodejs.org](https://nodejs.org/).
   * Al instalar Node.js, se instalará automáticamente **npm** (el gestor de paquetes de Node).

---

## 📂 ¿Cómo preparar el proyecto para entregarlo?

Al enviar este proyecto (por ejemplo, en un archivo `.zip`), **NO debes incluir la carpeta `node_modules`**. Esta carpeta contiene gigabytes de código de librerías de terceros que se pueden reconstruir automáticamente con un solo comando.

### Qué enviar:
* 📁 `src/` (Código fuente en JavaScript)
* 📄 `index.html` (Estructura web principal)
* 📄 `style.css` (Estilos del HUD y menú interactivo)
* 📄 `package.json` y `package-lock.json` (Configuración de dependencias)
* 📄 `vite.config.js` (Configuración de Vite)
* 📄 `README.md` (Esta guía)

---

## 🚀 Pasos para Ejecutar el Proyecto (Instrucciones para el evaluador)

Una vez que el evaluador reciba la carpeta del proyecto, debe seguir estos pasos en su terminal (símbolo del sistema, PowerShell, o la terminal de VS Code):

### 1. Instalar las dependencias
Este comando descargará e instalará **Three.js** y **Vite** automáticamente basándose en los archivos `package.json`:
```bash
npm install
```

### 2. Iniciar el servidor de desarrollo en local
Este comando arrancará el servidor web local ultrarrápido provisto por Vite:
```bash
npm run dev
```

### 3. Abrir el simulador en el navegador
Una vez iniciado, la consola mostrará una dirección local similar a:
```text
  ➜  Local:   http://localhost:3000/
```
El evaluador solo debe hacer **Ctrl + Click** sobre ese enlace (o abrir `http://localhost:3000/` en cualquier navegador web moderno como Chrome, Edge o Firefox) para comenzar a jugar.

---

## 🎮 Controles del Juego

El juego cuenta con controles optimizados de simulación F1:

| Tecla / Acción | Función |
| :--- | :--- |
| **W** o **↑ (Flecha Arriba)** | Acelerar el monoplaza |
| **S** o **↓ (Flecha Abajo)** | Frenar / Reversa |
| **A / D** o **← / →** | Girar a la izquierda / derecha |
| **Espacio (Space)** | Freno de mano / Frenada de emergencia |
| **Shift (Mayús)** | **DRS** (Drag Reduction System) — Mayor velocidad en rectas al estar cerca |
| **C** | Cambiar de cámara (Tercera persona / Vista de cabina / Aérea) |
| **R** | Activar / Desactivar la lluvia en tiempo real |
| **Esc (Escape)** | Pausar la carrera / Abrir el menú de pausa |

### 🔧 Paradas en Pits (Pit Stops)
Al entrar al carril de pits, se activa el limitador de velocidad a 50 km/h de forma automática. Durante la parada técnica, puedes cambiar el compuesto de tus neumáticos presionando:
* **`1`** 🔴 **SOFT (Blandos):** Máximo agarre, pero desgaste acelerado.
* **`2`** 🟡 **MEDIUM (Medios):** Agarre y durabilidad balanceados.
* **`3`** ⚪ **HARD (Duros):** Agarre reducido, máxima durabilidad.

---

## 🏗️ Estructura del Código

El proyecto sigue una estructura limpia y modular:

* **`index.html`**: Estructura principal de la aplicación, que contiene el HUD en tiempo real (Velocímetro, ERS, DRS, indicador de lluvia, tabla de posiciones dinámica y minimapa en formato SVG), y las pantallas de menú principal, pausa, DNF y victoria.
* **`style.css`**: Contiene todo el diseño estético premium de la interfaz de usuario con temática deportiva (neon glows, fuentes optimizadas y animaciones dinámicas).
* **`src/main.js`**: Punto de entrada de la aplicación de JavaScript. Inicializa el bucle de renderizado de Three.js, gestiona la física del coche, el clima dinámico, las reglas de carrera (como colisiones y penalizaciones fuera de pista) y las interacciones del menú.
* **`src/entities/`**: Módulos que manejan las entidades físicas (como el comportamiento del coche del jugador y de los oponentes de IA).
* **`src/world/`**: Genera la pista en 3D basada en las curvas de spline seleccionadas y coloca los elementos decorativos del circuito.

---

## 📦 Compilación para Producción (Opcional)

Si deseas subir el juego a un servidor web para que cualquiera pueda jugarlo online sin instalar nada en su ordenador (por ejemplo, en Vercel, Netlify o GitHub Pages):

1. Compila el proyecto ejecutando:
   ```bash
   npm run build
   ```
2. Esto generará una carpeta llamada **`dist`** que contiene los archivos finales optimizados, minificados y listos para ser subidos a cualquier hosting web estático.
