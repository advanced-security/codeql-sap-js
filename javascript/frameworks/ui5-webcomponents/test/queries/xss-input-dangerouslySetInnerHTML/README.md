# Minimal Demo Example of XSS in UI5-Webcomponents for React

This is a minimal example to demonstrate how XSS might happen in an application written with [UI5-Webcomponents for React](https://ui5.github.io/webcomponents-react/).

## Steps to trigger XSS

1. `npm install` and `npm start`, navigate to `localhost:3000`
2. Input `<img src="nonexistent.jpg" onerror="alert('xss')"/>` in the [`Input` component](https://ui5.github.io/webcomponents/components/Input/)

