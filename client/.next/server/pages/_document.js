"use strict";
/*
 * ATTENTION: An "eval-source-map" devtool has been used.
 * This devtool is neither made for production nor for readable output files.
 * It uses "eval()" calls to create a separate source file with attached SourceMaps in the browser devtools.
 * If you are trying to read the output file, select a different devtool (https://webpack.js.org/configuration/devtool/)
 * or disable the default devtool with "devtool: false".
 * If you are looking for production-ready output files, see mode: "production" (https://webpack.js.org/configuration/mode/).
 */
(() => {
var exports = {};
exports.id = "pages/_document";
exports.ids = ["pages/_document"];
exports.modules = {

/***/ "./src/pages/_document.tsx":
/*!*********************************!*\
  !*** ./src/pages/_document.tsx ***!
  \*********************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

eval("__webpack_require__.r(__webpack_exports__);\n/* harmony export */ __webpack_require__.d(__webpack_exports__, {\n/* harmony export */   \"default\": () => (__WEBPACK_DEFAULT_EXPORT__)\n/* harmony export */ });\n/* harmony import */ var react_jsx_dev_runtime__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! react/jsx-dev-runtime */ \"react/jsx-dev-runtime\");\n/* harmony import */ var react_jsx_dev_runtime__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(react_jsx_dev_runtime__WEBPACK_IMPORTED_MODULE_0__);\n/* harmony import */ var react__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! react */ \"react\");\n/* harmony import */ var react__WEBPACK_IMPORTED_MODULE_1___default = /*#__PURE__*/__webpack_require__.n(react__WEBPACK_IMPORTED_MODULE_1__);\n/* harmony import */ var next_document__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! next/document */ \"./node_modules/next/document.js\");\n/* harmony import */ var next_document__WEBPACK_IMPORTED_MODULE_2___default = /*#__PURE__*/__webpack_require__.n(next_document__WEBPACK_IMPORTED_MODULE_2__);\n/* harmony import */ var _mui_styles__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! @mui/styles */ \"@mui/styles\");\n/* harmony import */ var _mui_styles__WEBPACK_IMPORTED_MODULE_3___default = /*#__PURE__*/__webpack_require__.n(_mui_styles__WEBPACK_IMPORTED_MODULE_3__);\n\n\n\n\nclass MyDocument extends (next_document__WEBPACK_IMPORTED_MODULE_2___default()) {\n    static async getInitialProps(ctx) {\n        const sheets = new _mui_styles__WEBPACK_IMPORTED_MODULE_3__.ServerStyleSheets();\n        const originalRenderPage = ctx.renderPage;\n        ctx.renderPage = ()=>originalRenderPage({\n                enhanceApp: (App)=>(props)=>sheets.collect(/*#__PURE__*/ (0,react_jsx_dev_runtime__WEBPACK_IMPORTED_MODULE_0__.jsxDEV)(App, {\n                            ...props\n                        }, void 0, false, {\n                            fileName: \"C:\\\\VF\\\\TeleDrive\\\\client\\\\src\\\\pages\\\\_document.tsx\",\n                            lineNumber: 12,\n                            columnNumber: 56\n                        }, this))\n            });\n        const initialProps = await next_document__WEBPACK_IMPORTED_MODULE_2___default().getInitialProps(ctx);\n        return {\n            ...initialProps,\n            styles: [\n                ...react__WEBPACK_IMPORTED_MODULE_1___default().Children.toArray(initialProps.styles),\n                sheets.getStyleElement()\n            ]\n        };\n    }\n    render() {\n        return /*#__PURE__*/ (0,react_jsx_dev_runtime__WEBPACK_IMPORTED_MODULE_0__.jsxDEV)(next_document__WEBPACK_IMPORTED_MODULE_2__.Html, {\n            lang: \"vi\",\n            children: [\n                /*#__PURE__*/ (0,react_jsx_dev_runtime__WEBPACK_IMPORTED_MODULE_0__.jsxDEV)(next_document__WEBPACK_IMPORTED_MODULE_2__.Head, {\n                    children: [\n                        /*#__PURE__*/ (0,react_jsx_dev_runtime__WEBPACK_IMPORTED_MODULE_0__.jsxDEV)(\"meta\", {\n                            charSet: \"utf-8\"\n                        }, void 0, false, {\n                            fileName: \"C:\\\\VF\\\\TeleDrive\\\\client\\\\src\\\\pages\\\\_document.tsx\",\n                            lineNumber: 27,\n                            columnNumber: 11\n                        }, this),\n                        /*#__PURE__*/ (0,react_jsx_dev_runtime__WEBPACK_IMPORTED_MODULE_0__.jsxDEV)(\"meta\", {\n                            name: \"theme-color\",\n                            content: \"#2AABEE\"\n                        }, void 0, false, {\n                            fileName: \"C:\\\\VF\\\\TeleDrive\\\\client\\\\src\\\\pages\\\\_document.tsx\",\n                            lineNumber: 28,\n                            columnNumber: 11\n                        }, this),\n                        /*#__PURE__*/ (0,react_jsx_dev_runtime__WEBPACK_IMPORTED_MODULE_0__.jsxDEV)(\"meta\", {\n                            name: \"description\",\n                            content: \"Lưu trữ đ\\xe1m m\\xe2y kh\\xf4ng giới hạn bằng Telegram\"\n                        }, void 0, false, {\n                            fileName: \"C:\\\\VF\\\\TeleDrive\\\\client\\\\src\\\\pages\\\\_document.tsx\",\n                            lineNumber: 29,\n                            columnNumber: 11\n                        }, this),\n                        /*#__PURE__*/ (0,react_jsx_dev_runtime__WEBPACK_IMPORTED_MODULE_0__.jsxDEV)(\"link\", {\n                            rel: \"icon\",\n                            href: \"/favicon.ico\"\n                        }, void 0, false, {\n                            fileName: \"C:\\\\VF\\\\TeleDrive\\\\client\\\\src\\\\pages\\\\_document.tsx\",\n                            lineNumber: 30,\n                            columnNumber: 11\n                        }, this),\n                        /*#__PURE__*/ (0,react_jsx_dev_runtime__WEBPACK_IMPORTED_MODULE_0__.jsxDEV)(\"link\", {\n                            rel: \"apple-touch-icon\",\n                            href: \"/logo192.png\"\n                        }, void 0, false, {\n                            fileName: \"C:\\\\VF\\\\TeleDrive\\\\client\\\\src\\\\pages\\\\_document.tsx\",\n                            lineNumber: 31,\n                            columnNumber: 11\n                        }, this),\n                        /*#__PURE__*/ (0,react_jsx_dev_runtime__WEBPACK_IMPORTED_MODULE_0__.jsxDEV)(\"link\", {\n                            rel: \"stylesheet\",\n                            href: \"https://fonts.googleapis.com/css?family=Roboto:300,400,500,700&display=swap\"\n                        }, void 0, false, {\n                            fileName: \"C:\\\\VF\\\\TeleDrive\\\\client\\\\src\\\\pages\\\\_document.tsx\",\n                            lineNumber: 32,\n                            columnNumber: 11\n                        }, this)\n                    ]\n                }, void 0, true, {\n                    fileName: \"C:\\\\VF\\\\TeleDrive\\\\client\\\\src\\\\pages\\\\_document.tsx\",\n                    lineNumber: 26,\n                    columnNumber: 9\n                }, this),\n                /*#__PURE__*/ (0,react_jsx_dev_runtime__WEBPACK_IMPORTED_MODULE_0__.jsxDEV)(\"body\", {\n                    children: [\n                        /*#__PURE__*/ (0,react_jsx_dev_runtime__WEBPACK_IMPORTED_MODULE_0__.jsxDEV)(next_document__WEBPACK_IMPORTED_MODULE_2__.Main, {}, void 0, false, {\n                            fileName: \"C:\\\\VF\\\\TeleDrive\\\\client\\\\src\\\\pages\\\\_document.tsx\",\n                            lineNumber: 38,\n                            columnNumber: 11\n                        }, this),\n                        /*#__PURE__*/ (0,react_jsx_dev_runtime__WEBPACK_IMPORTED_MODULE_0__.jsxDEV)(next_document__WEBPACK_IMPORTED_MODULE_2__.NextScript, {}, void 0, false, {\n                            fileName: \"C:\\\\VF\\\\TeleDrive\\\\client\\\\src\\\\pages\\\\_document.tsx\",\n                            lineNumber: 39,\n                            columnNumber: 11\n                        }, this)\n                    ]\n                }, void 0, true, {\n                    fileName: \"C:\\\\VF\\\\TeleDrive\\\\client\\\\src\\\\pages\\\\_document.tsx\",\n                    lineNumber: 37,\n                    columnNumber: 9\n                }, this)\n            ]\n        }, void 0, true, {\n            fileName: \"C:\\\\VF\\\\TeleDrive\\\\client\\\\src\\\\pages\\\\_document.tsx\",\n            lineNumber: 25,\n            columnNumber: 7\n        }, this);\n    }\n}\n/* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = (MyDocument);\n//# sourceURL=[module]\n//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiLi9zcmMvcGFnZXMvX2RvY3VtZW50LnRzeCIsIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7O0FBQTBCO0FBQzhEO0FBQ3hDO0FBRWhELE1BQU1PLG1CQUFtQk4sc0RBQVFBO0lBQy9CLGFBQWFPLGdCQUFnQkMsR0FBb0IsRUFBRTtRQUNqRCxNQUFNQyxTQUFTLElBQUlKLDBEQUFpQkE7UUFDcEMsTUFBTUsscUJBQXFCRixJQUFJRyxVQUFVO1FBRXpDSCxJQUFJRyxVQUFVLEdBQUcsSUFDZkQsbUJBQW1CO2dCQUNqQkUsWUFBWSxDQUFDQyxNQUFRLENBQUNDLFFBQVVMLE9BQU9NLE9BQU8sZUFBQyw4REFBQ0Y7NEJBQUssR0FBR0MsS0FBSzs7Ozs7O1lBQy9EO1FBRUYsTUFBTUUsZUFBZSxNQUFNaEIsb0VBQXdCLENBQUNRO1FBRXBELE9BQU87WUFDTCxHQUFHUSxZQUFZO1lBQ2ZDLFFBQVE7bUJBQUlsQixxREFBYyxDQUFDb0IsT0FBTyxDQUFDSCxhQUFhQyxNQUFNO2dCQUFHUixPQUFPVyxlQUFlO2FBQUc7UUFDcEY7SUFDRjtJQUVBQyxTQUFTO1FBQ1AscUJBQ0UsOERBQUNwQiwrQ0FBSUE7WUFBQ3FCLE1BQUs7OzhCQUNULDhEQUFDcEIsK0NBQUlBOztzQ0FDSCw4REFBQ3FCOzRCQUFLQyxTQUFROzs7Ozs7c0NBQ2QsOERBQUNEOzRCQUFLRSxNQUFLOzRCQUFjQyxTQUFROzs7Ozs7c0NBQ2pDLDhEQUFDSDs0QkFBS0UsTUFBSzs0QkFBY0MsU0FBUTs7Ozs7O3NDQUNqQyw4REFBQ0M7NEJBQUtDLEtBQUk7NEJBQU9DLE1BQUs7Ozs7OztzQ0FDdEIsOERBQUNGOzRCQUFLQyxLQUFJOzRCQUFtQkMsTUFBSzs7Ozs7O3NDQUNsQyw4REFBQ0Y7NEJBQ0NDLEtBQUk7NEJBQ0pDLE1BQUs7Ozs7Ozs7Ozs7Ozs4QkFHVCw4REFBQ0M7O3NDQUNDLDhEQUFDM0IsK0NBQUlBOzs7OztzQ0FDTCw4REFBQ0MscURBQVVBOzs7Ozs7Ozs7Ozs7Ozs7OztJQUluQjtBQUNGO0FBRUEsaUVBQWVFLFVBQVVBLEVBQUMiLCJzb3VyY2VzIjpbIndlYnBhY2s6Ly90ZWxlZHJpdmUtY2xpZW50Ly4vc3JjL3BhZ2VzL19kb2N1bWVudC50c3g/MTg4ZSJdLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgUmVhY3QgZnJvbSAncmVhY3QnO1xyXG5pbXBvcnQgRG9jdW1lbnQsIHsgSHRtbCwgSGVhZCwgTWFpbiwgTmV4dFNjcmlwdCwgRG9jdW1lbnRDb250ZXh0IH0gZnJvbSAnbmV4dC9kb2N1bWVudCc7XHJcbmltcG9ydCB7IFNlcnZlclN0eWxlU2hlZXRzIH0gZnJvbSAnQG11aS9zdHlsZXMnO1xyXG5cclxuY2xhc3MgTXlEb2N1bWVudCBleHRlbmRzIERvY3VtZW50IHtcclxuICBzdGF0aWMgYXN5bmMgZ2V0SW5pdGlhbFByb3BzKGN0eDogRG9jdW1lbnRDb250ZXh0KSB7XHJcbiAgICBjb25zdCBzaGVldHMgPSBuZXcgU2VydmVyU3R5bGVTaGVldHMoKTtcclxuICAgIGNvbnN0IG9yaWdpbmFsUmVuZGVyUGFnZSA9IGN0eC5yZW5kZXJQYWdlO1xyXG5cclxuICAgIGN0eC5yZW5kZXJQYWdlID0gKCkgPT5cclxuICAgICAgb3JpZ2luYWxSZW5kZXJQYWdlKHtcclxuICAgICAgICBlbmhhbmNlQXBwOiAoQXBwKSA9PiAocHJvcHMpID0+IHNoZWV0cy5jb2xsZWN0KDxBcHAgey4uLnByb3BzfSAvPiksXHJcbiAgICAgIH0pO1xyXG5cclxuICAgIGNvbnN0IGluaXRpYWxQcm9wcyA9IGF3YWl0IERvY3VtZW50LmdldEluaXRpYWxQcm9wcyhjdHgpO1xyXG5cclxuICAgIHJldHVybiB7XHJcbiAgICAgIC4uLmluaXRpYWxQcm9wcyxcclxuICAgICAgc3R5bGVzOiBbLi4uUmVhY3QuQ2hpbGRyZW4udG9BcnJheShpbml0aWFsUHJvcHMuc3R5bGVzKSwgc2hlZXRzLmdldFN0eWxlRWxlbWVudCgpXSxcclxuICAgIH07XHJcbiAgfVxyXG5cclxuICByZW5kZXIoKSB7XHJcbiAgICByZXR1cm4gKFxyXG4gICAgICA8SHRtbCBsYW5nPVwidmlcIj5cclxuICAgICAgICA8SGVhZD5cclxuICAgICAgICAgIDxtZXRhIGNoYXJTZXQ9XCJ1dGYtOFwiIC8+XHJcbiAgICAgICAgICA8bWV0YSBuYW1lPVwidGhlbWUtY29sb3JcIiBjb250ZW50PVwiIzJBQUJFRVwiIC8+XHJcbiAgICAgICAgICA8bWV0YSBuYW1lPVwiZGVzY3JpcHRpb25cIiBjb250ZW50PVwiTMawdSB0cuG7ryDEkcOhbSBtw6J5IGtow7RuZyBnaeG7m2kgaOG6oW4gYuG6sW5nIFRlbGVncmFtXCIgLz5cclxuICAgICAgICAgIDxsaW5rIHJlbD1cImljb25cIiBocmVmPVwiL2Zhdmljb24uaWNvXCIgLz5cclxuICAgICAgICAgIDxsaW5rIHJlbD1cImFwcGxlLXRvdWNoLWljb25cIiBocmVmPVwiL2xvZ28xOTIucG5nXCIgLz5cclxuICAgICAgICAgIDxsaW5rXHJcbiAgICAgICAgICAgIHJlbD1cInN0eWxlc2hlZXRcIlxyXG4gICAgICAgICAgICBocmVmPVwiaHR0cHM6Ly9mb250cy5nb29nbGVhcGlzLmNvbS9jc3M/ZmFtaWx5PVJvYm90bzozMDAsNDAwLDUwMCw3MDAmZGlzcGxheT1zd2FwXCJcclxuICAgICAgICAgIC8+XHJcbiAgICAgICAgPC9IZWFkPlxyXG4gICAgICAgIDxib2R5PlxyXG4gICAgICAgICAgPE1haW4gLz5cclxuICAgICAgICAgIDxOZXh0U2NyaXB0IC8+XHJcbiAgICAgICAgPC9ib2R5PlxyXG4gICAgICA8L0h0bWw+XHJcbiAgICApO1xyXG4gIH1cclxufVxyXG5cclxuZXhwb3J0IGRlZmF1bHQgTXlEb2N1bWVudDsgIl0sIm5hbWVzIjpbIlJlYWN0IiwiRG9jdW1lbnQiLCJIdG1sIiwiSGVhZCIsIk1haW4iLCJOZXh0U2NyaXB0IiwiU2VydmVyU3R5bGVTaGVldHMiLCJNeURvY3VtZW50IiwiZ2V0SW5pdGlhbFByb3BzIiwiY3R4Iiwic2hlZXRzIiwib3JpZ2luYWxSZW5kZXJQYWdlIiwicmVuZGVyUGFnZSIsImVuaGFuY2VBcHAiLCJBcHAiLCJwcm9wcyIsImNvbGxlY3QiLCJpbml0aWFsUHJvcHMiLCJzdHlsZXMiLCJDaGlsZHJlbiIsInRvQXJyYXkiLCJnZXRTdHlsZUVsZW1lbnQiLCJyZW5kZXIiLCJsYW5nIiwibWV0YSIsImNoYXJTZXQiLCJuYW1lIiwiY29udGVudCIsImxpbmsiLCJyZWwiLCJocmVmIiwiYm9keSJdLCJzb3VyY2VSb290IjoiIn0=\n//# sourceURL=webpack-internal:///./src/pages/_document.tsx\n");

/***/ }),

/***/ "@mui/styles":
/*!******************************!*\
  !*** external "@mui/styles" ***!
  \******************************/
/***/ ((module) => {

module.exports = require("@mui/styles");

/***/ }),

/***/ "next/dist/compiled/next-server/pages.runtime.dev.js":
/*!**********************************************************************!*\
  !*** external "next/dist/compiled/next-server/pages.runtime.dev.js" ***!
  \**********************************************************************/
/***/ ((module) => {

module.exports = require("next/dist/compiled/next-server/pages.runtime.dev.js");

/***/ }),

/***/ "react":
/*!************************!*\
  !*** external "react" ***!
  \************************/
/***/ ((module) => {

module.exports = require("react");

/***/ }),

/***/ "react/jsx-dev-runtime":
/*!****************************************!*\
  !*** external "react/jsx-dev-runtime" ***!
  \****************************************/
/***/ ((module) => {

module.exports = require("react/jsx-dev-runtime");

/***/ }),

/***/ "react/jsx-runtime":
/*!************************************!*\
  !*** external "react/jsx-runtime" ***!
  \************************************/
/***/ ((module) => {

module.exports = require("react/jsx-runtime");

/***/ }),

/***/ "path":
/*!***********************!*\
  !*** external "path" ***!
  \***********************/
/***/ ((module) => {

module.exports = require("path");

/***/ })

};
;

// load runtime
var __webpack_require__ = require("../webpack-runtime.js");
__webpack_require__.C(exports);
var __webpack_exec__ = (moduleId) => (__webpack_require__(__webpack_require__.s = moduleId))
var __webpack_exports__ = __webpack_require__.X(0, ["vendor-chunks/next","vendor-chunks/@swc"], () => (__webpack_exec__("./src/pages/_document.tsx")));
module.exports = __webpack_exports__;

})();