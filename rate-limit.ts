@tailwind base;
@tailwind components;
@tailwind utilities;

:root {
  color-scheme: dark;
}

* {
  box-sizing: border-box;
}

html {
  scroll-behavior: smooth;
}

body {
  margin: 0;
  background: #050505;
  color: #ffffff;
  font-family: Arial, "Noto Sans Arabic", sans-serif;
}

button,
input,
textarea,
select {
  font: inherit;
}

::selection {
  background: rgba(234, 179, 8, 0.35);
}

.input {
  width: 100%;
  border: 1px solid rgba(255,255,255,.12);
  border-radius: .9rem;
  background: rgba(0,0,0,.5);
  padding: .85rem 1rem;
  color: white;
  outline: none;
  transition: border-color .2s ease, background .2s ease;
}
.input:focus { border-color: rgb(234 179 8); background: rgba(0,0,0,.7); }
.input:disabled { opacity: .55; cursor: not-allowed; }
