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
exports.id = "pages/_app";
exports.ids = ["pages/_app"];
exports.modules = {

/***/ "./src/pages/_app.tsx":
/*!****************************!*\
  !*** ./src/pages/_app.tsx ***!
  \****************************/
/***/ ((module, __webpack_exports__, __webpack_require__) => {

"use strict";
eval("__webpack_require__.a(module, async (__webpack_handle_async_dependencies__, __webpack_async_result__) => { try {\n__webpack_require__.r(__webpack_exports__);\n/* harmony export */ __webpack_require__.d(__webpack_exports__, {\n/* harmony export */   \"default\": () => (__WEBPACK_DEFAULT_EXPORT__)\n/* harmony export */ });\n/* harmony import */ var react_jsx_dev_runtime__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! react/jsx-dev-runtime */ \"react/jsx-dev-runtime\");\n/* harmony import */ var react_jsx_dev_runtime__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(react_jsx_dev_runtime__WEBPACK_IMPORTED_MODULE_0__);\n/* harmony import */ var react__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! react */ \"react\");\n/* harmony import */ var react__WEBPACK_IMPORTED_MODULE_1___default = /*#__PURE__*/__webpack_require__.n(react__WEBPACK_IMPORTED_MODULE_1__);\n/* harmony import */ var _mui_material_styles__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! @mui/material/styles */ \"@mui/material/styles\");\n/* harmony import */ var _mui_material_styles__WEBPACK_IMPORTED_MODULE_2___default = /*#__PURE__*/__webpack_require__.n(_mui_material_styles__WEBPACK_IMPORTED_MODULE_2__);\n/* harmony import */ var _mui_material_CssBaseline__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! @mui/material/CssBaseline */ \"@mui/material/CssBaseline\");\n/* harmony import */ var _mui_material_CssBaseline__WEBPACK_IMPORTED_MODULE_3___default = /*#__PURE__*/__webpack_require__.n(_mui_material_CssBaseline__WEBPACK_IMPORTED_MODULE_3__);\n/* harmony import */ var react_toastify__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(/*! react-toastify */ \"react-toastify\");\n/* harmony import */ var react_toastify_dist_ReactToastify_css__WEBPACK_IMPORTED_MODULE_5__ = __webpack_require__(/*! react-toastify/dist/ReactToastify.css */ \"./node_modules/react-toastify/dist/ReactToastify.css\");\n/* harmony import */ var react_toastify_dist_ReactToastify_css__WEBPACK_IMPORTED_MODULE_5___default = /*#__PURE__*/__webpack_require__.n(react_toastify_dist_ReactToastify_css__WEBPACK_IMPORTED_MODULE_5__);\n/* harmony import */ var _styles_globals_css__WEBPACK_IMPORTED_MODULE_6__ = __webpack_require__(/*! ../styles/globals.css */ \"./src/styles/globals.css\");\n/* harmony import */ var _styles_globals_css__WEBPACK_IMPORTED_MODULE_6___default = /*#__PURE__*/__webpack_require__.n(_styles_globals_css__WEBPACK_IMPORTED_MODULE_6__);\n/* harmony import */ var _emotion_react__WEBPACK_IMPORTED_MODULE_7__ = __webpack_require__(/*! @emotion/react */ \"@emotion/react\");\n/* harmony import */ var _utils_createEmotionCache__WEBPACK_IMPORTED_MODULE_8__ = __webpack_require__(/*! ../utils/createEmotionCache */ \"./src/utils/createEmotionCache.ts\");\nvar __webpack_async_dependencies__ = __webpack_handle_async_dependencies__([react_toastify__WEBPACK_IMPORTED_MODULE_4__, _emotion_react__WEBPACK_IMPORTED_MODULE_7__, _utils_createEmotionCache__WEBPACK_IMPORTED_MODULE_8__]);\n([react_toastify__WEBPACK_IMPORTED_MODULE_4__, _emotion_react__WEBPACK_IMPORTED_MODULE_7__, _utils_createEmotionCache__WEBPACK_IMPORTED_MODULE_8__] = __webpack_async_dependencies__.then ? (await __webpack_async_dependencies__)() : __webpack_async_dependencies__);\n\n\n\n\n\n\n\n\n\n// Client-side cache, shared for the whole session of the user\nconst clientSideEmotionCache = (0,_utils_createEmotionCache__WEBPACK_IMPORTED_MODULE_8__.createEmotionCache)();\n// Tạo theme cho ứng dụng\nconst theme = (0,_mui_material_styles__WEBPACK_IMPORTED_MODULE_2__.createTheme)({\n    palette: {\n        mode: \"light\",\n        primary: {\n            main: \"#2AABEE\"\n        },\n        secondary: {\n            main: \"#0088cc\"\n        },\n        background: {\n            default: \"#f5f5f5\",\n            paper: \"#ffffff\"\n        }\n    },\n    typography: {\n        fontFamily: [\n            \"-apple-system\",\n            \"BlinkMacSystemFont\",\n            '\"Segoe UI\"',\n            \"Roboto\",\n            '\"Helvetica Neue\"',\n            \"Arial\",\n            \"sans-serif\"\n        ].join(\",\")\n    },\n    components: {\n        MuiButton: {\n            styleOverrides: {\n                root: {\n                    borderRadius: 8,\n                    textTransform: \"none\",\n                    fontWeight: 500\n                }\n            }\n        },\n        MuiAppBar: {\n            styleOverrides: {\n                root: {\n                    boxShadow: \"0px 1px 4px rgba(0, 0, 0, 0.05)\"\n                }\n            }\n        }\n    }\n});\nfunction MyApp({ Component, pageProps, emotionCache = clientSideEmotionCache }) {\n    react__WEBPACK_IMPORTED_MODULE_1___default().useEffect(()=>{\n        // Remove the server-side injected CSS\n        const jssStyles = document.querySelector(\"#jss-server-side\");\n        if (jssStyles && jssStyles.parentElement) {\n            jssStyles.parentElement.removeChild(jssStyles);\n        }\n    }, []);\n    return /*#__PURE__*/ (0,react_jsx_dev_runtime__WEBPACK_IMPORTED_MODULE_0__.jsxDEV)(_emotion_react__WEBPACK_IMPORTED_MODULE_7__.CacheProvider, {\n        value: emotionCache,\n        children: /*#__PURE__*/ (0,react_jsx_dev_runtime__WEBPACK_IMPORTED_MODULE_0__.jsxDEV)(_mui_material_styles__WEBPACK_IMPORTED_MODULE_2__.ThemeProvider, {\n            theme: theme,\n            children: [\n                /*#__PURE__*/ (0,react_jsx_dev_runtime__WEBPACK_IMPORTED_MODULE_0__.jsxDEV)((_mui_material_CssBaseline__WEBPACK_IMPORTED_MODULE_3___default()), {}, void 0, false, {\n                    fileName: \"C:\\\\VF\\\\TeleDrive\\\\client\\\\src\\\\pages\\\\_app.tsx\",\n                    lineNumber: 76,\n                    columnNumber: 9\n                }, this),\n                /*#__PURE__*/ (0,react_jsx_dev_runtime__WEBPACK_IMPORTED_MODULE_0__.jsxDEV)(Component, {\n                    ...pageProps\n                }, void 0, false, {\n                    fileName: \"C:\\\\VF\\\\TeleDrive\\\\client\\\\src\\\\pages\\\\_app.tsx\",\n                    lineNumber: 77,\n                    columnNumber: 9\n                }, this),\n                /*#__PURE__*/ (0,react_jsx_dev_runtime__WEBPACK_IMPORTED_MODULE_0__.jsxDEV)(react_toastify__WEBPACK_IMPORTED_MODULE_4__.ToastContainer, {\n                    position: \"bottom-right\",\n                    autoClose: 5000,\n                    hideProgressBar: false,\n                    newestOnTop: true,\n                    closeOnClick: true,\n                    rtl: false,\n                    pauseOnFocusLoss: true,\n                    draggable: true,\n                    pauseOnHover: true\n                }, void 0, false, {\n                    fileName: \"C:\\\\VF\\\\TeleDrive\\\\client\\\\src\\\\pages\\\\_app.tsx\",\n                    lineNumber: 78,\n                    columnNumber: 9\n                }, this)\n            ]\n        }, void 0, true, {\n            fileName: \"C:\\\\VF\\\\TeleDrive\\\\client\\\\src\\\\pages\\\\_app.tsx\",\n            lineNumber: 75,\n            columnNumber: 7\n        }, this)\n    }, void 0, false, {\n        fileName: \"C:\\\\VF\\\\TeleDrive\\\\client\\\\src\\\\pages\\\\_app.tsx\",\n        lineNumber: 74,\n        columnNumber: 5\n    }, this);\n}\n/* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = (MyApp);\n\n__webpack_async_result__();\n} catch(e) { __webpack_async_result__(e); } });//# sourceURL=[module]\n//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiLi9zcmMvcGFnZXMvX2FwcC50c3giLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFBMEI7QUFFd0M7QUFDZDtBQUNKO0FBQ0Q7QUFDaEI7QUFDZ0I7QUFDa0I7QUFFakUsOERBQThEO0FBQzlELE1BQU1PLHlCQUF5QkQsNkVBQWtCQTtBQUVqRCx5QkFBeUI7QUFDekIsTUFBTUUsUUFBUU4saUVBQVdBLENBQUM7SUFDeEJPLFNBQVM7UUFDUEMsTUFBTTtRQUNOQyxTQUFTO1lBQ1BDLE1BQU07UUFDUjtRQUNBQyxXQUFXO1lBQ1RELE1BQU07UUFDUjtRQUNBRSxZQUFZO1lBQ1ZDLFNBQVM7WUFDVEMsT0FBTztRQUNUO0lBQ0Y7SUFDQUMsWUFBWTtRQUNWQyxZQUFZO1lBQ1Y7WUFDQTtZQUNBO1lBQ0E7WUFDQTtZQUNBO1lBQ0E7U0FDRCxDQUFDQyxJQUFJLENBQUM7SUFDVDtJQUNBQyxZQUFZO1FBQ1ZDLFdBQVc7WUFDVEMsZ0JBQWdCO2dCQUNkQyxNQUFNO29CQUNKQyxjQUFjO29CQUNkQyxlQUFlO29CQUNmQyxZQUFZO2dCQUNkO1lBQ0Y7UUFDRjtRQUNBQyxXQUFXO1lBQ1RMLGdCQUFnQjtnQkFDZEMsTUFBTTtvQkFDSkssV0FBVztnQkFDYjtZQUNGO1FBQ0Y7SUFDRjtBQUNGO0FBTUEsU0FBU0MsTUFBTSxFQUFFQyxTQUFTLEVBQUVDLFNBQVMsRUFBRUMsZUFBZXpCLHNCQUFzQixFQUFjO0lBQ3hGUCxzREFBZSxDQUFDO1FBQ2Qsc0NBQXNDO1FBQ3RDLE1BQU1rQyxZQUFZQyxTQUFTQyxhQUFhLENBQUM7UUFDekMsSUFBSUYsYUFBYUEsVUFBVUcsYUFBYSxFQUFFO1lBQ3hDSCxVQUFVRyxhQUFhLENBQUNDLFdBQVcsQ0FBQ0o7UUFDdEM7SUFDRixHQUFHLEVBQUU7SUFFTCxxQkFDRSw4REFBQzdCLHlEQUFhQTtRQUFDa0MsT0FBT1A7a0JBQ3BCLDRFQUFDL0IsK0RBQWFBO1lBQUNPLE9BQU9BOzs4QkFDcEIsOERBQUNMLGtFQUFXQTs7Ozs7OEJBQ1osOERBQUMyQjtvQkFBVyxHQUFHQyxTQUFTOzs7Ozs7OEJBQ3hCLDhEQUFDM0IsMERBQWNBO29CQUNib0MsVUFBUztvQkFDVEMsV0FBVztvQkFDWEMsaUJBQWlCO29CQUNqQkMsV0FBVztvQkFDWEMsWUFBWTtvQkFDWkMsS0FBSztvQkFDTEMsZ0JBQWdCO29CQUNoQkMsU0FBUztvQkFDVEMsWUFBWTs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFLdEI7QUFFQSxpRUFBZW5CLEtBQUtBLEVBQUMiLCJzb3VyY2VzIjpbIndlYnBhY2s6Ly90ZWxlZHJpdmUtY2xpZW50Ly4vc3JjL3BhZ2VzL19hcHAudHN4P2Y5ZDYiXSwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IFJlYWN0IGZyb20gJ3JlYWN0JztcclxuaW1wb3J0IHR5cGUgeyBBcHBQcm9wcyB9IGZyb20gJ25leHQvYXBwJztcclxuaW1wb3J0IHsgVGhlbWVQcm92aWRlciwgY3JlYXRlVGhlbWUgfSBmcm9tICdAbXVpL21hdGVyaWFsL3N0eWxlcyc7XHJcbmltcG9ydCBDc3NCYXNlbGluZSBmcm9tICdAbXVpL21hdGVyaWFsL0Nzc0Jhc2VsaW5lJztcclxuaW1wb3J0IHsgVG9hc3RDb250YWluZXIgfSBmcm9tICdyZWFjdC10b2FzdGlmeSc7XHJcbmltcG9ydCAncmVhY3QtdG9hc3RpZnkvZGlzdC9SZWFjdFRvYXN0aWZ5LmNzcyc7XHJcbmltcG9ydCAnLi4vc3R5bGVzL2dsb2JhbHMuY3NzJztcclxuaW1wb3J0IHsgQ2FjaGVQcm92aWRlciB9IGZyb20gJ0BlbW90aW9uL3JlYWN0JztcclxuaW1wb3J0IHsgY3JlYXRlRW1vdGlvbkNhY2hlIH0gZnJvbSAnLi4vdXRpbHMvY3JlYXRlRW1vdGlvbkNhY2hlJztcclxuXHJcbi8vIENsaWVudC1zaWRlIGNhY2hlLCBzaGFyZWQgZm9yIHRoZSB3aG9sZSBzZXNzaW9uIG9mIHRoZSB1c2VyXHJcbmNvbnN0IGNsaWVudFNpZGVFbW90aW9uQ2FjaGUgPSBjcmVhdGVFbW90aW9uQ2FjaGUoKTtcclxuXHJcbi8vIFThuqFvIHRoZW1lIGNobyDhu6luZyBk4bulbmdcclxuY29uc3QgdGhlbWUgPSBjcmVhdGVUaGVtZSh7XHJcbiAgcGFsZXR0ZToge1xyXG4gICAgbW9kZTogJ2xpZ2h0JyxcclxuICAgIHByaW1hcnk6IHtcclxuICAgICAgbWFpbjogJyMyQUFCRUUnLCAvLyBNw6B1IGNow61uaCBj4bunYSBUZWxlZ3JhbVxyXG4gICAgfSxcclxuICAgIHNlY29uZGFyeToge1xyXG4gICAgICBtYWluOiAnIzAwODhjYycsIC8vIE3DoHUgcGjhu6UgY+G7p2EgVGVsZWdyYW1cclxuICAgIH0sXHJcbiAgICBiYWNrZ3JvdW5kOiB7XHJcbiAgICAgIGRlZmF1bHQ6ICcjZjVmNWY1JyxcclxuICAgICAgcGFwZXI6ICcjZmZmZmZmJyxcclxuICAgIH0sXHJcbiAgfSxcclxuICB0eXBvZ3JhcGh5OiB7XHJcbiAgICBmb250RmFtaWx5OiBbXHJcbiAgICAgICctYXBwbGUtc3lzdGVtJyxcclxuICAgICAgJ0JsaW5rTWFjU3lzdGVtRm9udCcsXHJcbiAgICAgICdcIlNlZ29lIFVJXCInLFxyXG4gICAgICAnUm9ib3RvJyxcclxuICAgICAgJ1wiSGVsdmV0aWNhIE5ldWVcIicsXHJcbiAgICAgICdBcmlhbCcsXHJcbiAgICAgICdzYW5zLXNlcmlmJyxcclxuICAgIF0uam9pbignLCcpLFxyXG4gIH0sXHJcbiAgY29tcG9uZW50czoge1xyXG4gICAgTXVpQnV0dG9uOiB7XHJcbiAgICAgIHN0eWxlT3ZlcnJpZGVzOiB7XHJcbiAgICAgICAgcm9vdDoge1xyXG4gICAgICAgICAgYm9yZGVyUmFkaXVzOiA4LFxyXG4gICAgICAgICAgdGV4dFRyYW5zZm9ybTogJ25vbmUnLFxyXG4gICAgICAgICAgZm9udFdlaWdodDogNTAwLFxyXG4gICAgICAgIH0sXHJcbiAgICAgIH0sXHJcbiAgICB9LFxyXG4gICAgTXVpQXBwQmFyOiB7XHJcbiAgICAgIHN0eWxlT3ZlcnJpZGVzOiB7XHJcbiAgICAgICAgcm9vdDoge1xyXG4gICAgICAgICAgYm94U2hhZG93OiAnMHB4IDFweCA0cHggcmdiYSgwLCAwLCAwLCAwLjA1KScsXHJcbiAgICAgICAgfSxcclxuICAgICAgfSxcclxuICAgIH0sXHJcbiAgfSxcclxufSk7XHJcblxyXG50eXBlIE15QXBwUHJvcHMgPSBBcHBQcm9wcyAmIHtcclxuICBlbW90aW9uQ2FjaGU/OiBhbnk7XHJcbn07XHJcblxyXG5mdW5jdGlvbiBNeUFwcCh7IENvbXBvbmVudCwgcGFnZVByb3BzLCBlbW90aW9uQ2FjaGUgPSBjbGllbnRTaWRlRW1vdGlvbkNhY2hlIH06IE15QXBwUHJvcHMpIHtcclxuICBSZWFjdC51c2VFZmZlY3QoKCkgPT4ge1xyXG4gICAgLy8gUmVtb3ZlIHRoZSBzZXJ2ZXItc2lkZSBpbmplY3RlZCBDU1NcclxuICAgIGNvbnN0IGpzc1N0eWxlcyA9IGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoJyNqc3Mtc2VydmVyLXNpZGUnKTtcclxuICAgIGlmIChqc3NTdHlsZXMgJiYganNzU3R5bGVzLnBhcmVudEVsZW1lbnQpIHtcclxuICAgICAganNzU3R5bGVzLnBhcmVudEVsZW1lbnQucmVtb3ZlQ2hpbGQoanNzU3R5bGVzKTtcclxuICAgIH1cclxuICB9LCBbXSk7XHJcblxyXG4gIHJldHVybiAoXHJcbiAgICA8Q2FjaGVQcm92aWRlciB2YWx1ZT17ZW1vdGlvbkNhY2hlfT5cclxuICAgICAgPFRoZW1lUHJvdmlkZXIgdGhlbWU9e3RoZW1lfT5cclxuICAgICAgICA8Q3NzQmFzZWxpbmUgLz5cclxuICAgICAgICA8Q29tcG9uZW50IHsuLi5wYWdlUHJvcHN9IC8+XHJcbiAgICAgICAgPFRvYXN0Q29udGFpbmVyXHJcbiAgICAgICAgICBwb3NpdGlvbj1cImJvdHRvbS1yaWdodFwiXHJcbiAgICAgICAgICBhdXRvQ2xvc2U9ezUwMDB9XHJcbiAgICAgICAgICBoaWRlUHJvZ3Jlc3NCYXI9e2ZhbHNlfVxyXG4gICAgICAgICAgbmV3ZXN0T25Ub3BcclxuICAgICAgICAgIGNsb3NlT25DbGlja1xyXG4gICAgICAgICAgcnRsPXtmYWxzZX1cclxuICAgICAgICAgIHBhdXNlT25Gb2N1c0xvc3NcclxuICAgICAgICAgIGRyYWdnYWJsZVxyXG4gICAgICAgICAgcGF1c2VPbkhvdmVyXHJcbiAgICAgICAgLz5cclxuICAgICAgPC9UaGVtZVByb3ZpZGVyPlxyXG4gICAgPC9DYWNoZVByb3ZpZGVyPlxyXG4gICk7XHJcbn1cclxuXHJcbmV4cG9ydCBkZWZhdWx0IE15QXBwOyAiXSwibmFtZXMiOlsiUmVhY3QiLCJUaGVtZVByb3ZpZGVyIiwiY3JlYXRlVGhlbWUiLCJDc3NCYXNlbGluZSIsIlRvYXN0Q29udGFpbmVyIiwiQ2FjaGVQcm92aWRlciIsImNyZWF0ZUVtb3Rpb25DYWNoZSIsImNsaWVudFNpZGVFbW90aW9uQ2FjaGUiLCJ0aGVtZSIsInBhbGV0dGUiLCJtb2RlIiwicHJpbWFyeSIsIm1haW4iLCJzZWNvbmRhcnkiLCJiYWNrZ3JvdW5kIiwiZGVmYXVsdCIsInBhcGVyIiwidHlwb2dyYXBoeSIsImZvbnRGYW1pbHkiLCJqb2luIiwiY29tcG9uZW50cyIsIk11aUJ1dHRvbiIsInN0eWxlT3ZlcnJpZGVzIiwicm9vdCIsImJvcmRlclJhZGl1cyIsInRleHRUcmFuc2Zvcm0iLCJmb250V2VpZ2h0IiwiTXVpQXBwQmFyIiwiYm94U2hhZG93IiwiTXlBcHAiLCJDb21wb25lbnQiLCJwYWdlUHJvcHMiLCJlbW90aW9uQ2FjaGUiLCJ1c2VFZmZlY3QiLCJqc3NTdHlsZXMiLCJkb2N1bWVudCIsInF1ZXJ5U2VsZWN0b3IiLCJwYXJlbnRFbGVtZW50IiwicmVtb3ZlQ2hpbGQiLCJ2YWx1ZSIsInBvc2l0aW9uIiwiYXV0b0Nsb3NlIiwiaGlkZVByb2dyZXNzQmFyIiwibmV3ZXN0T25Ub3AiLCJjbG9zZU9uQ2xpY2siLCJydGwiLCJwYXVzZU9uRm9jdXNMb3NzIiwiZHJhZ2dhYmxlIiwicGF1c2VPbkhvdmVyIl0sInNvdXJjZVJvb3QiOiIifQ==\n//# sourceURL=webpack-internal:///./src/pages/_app.tsx\n");

/***/ }),

/***/ "./src/utils/createEmotionCache.ts":
/*!*****************************************!*\
  !*** ./src/utils/createEmotionCache.ts ***!
  \*****************************************/
/***/ ((module, __webpack_exports__, __webpack_require__) => {

"use strict";
eval("__webpack_require__.a(module, async (__webpack_handle_async_dependencies__, __webpack_async_result__) => { try {\n__webpack_require__.r(__webpack_exports__);\n/* harmony export */ __webpack_require__.d(__webpack_exports__, {\n/* harmony export */   createEmotionCache: () => (/* binding */ createEmotionCache)\n/* harmony export */ });\n/* harmony import */ var _emotion_cache__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! @emotion/cache */ \"@emotion/cache\");\nvar __webpack_async_dependencies__ = __webpack_handle_async_dependencies__([_emotion_cache__WEBPACK_IMPORTED_MODULE_0__]);\n_emotion_cache__WEBPACK_IMPORTED_MODULE_0__ = (__webpack_async_dependencies__.then ? (await __webpack_async_dependencies__)() : __webpack_async_dependencies__)[0];\n\nconst createEmotionCache = ()=>{\n    return (0,_emotion_cache__WEBPACK_IMPORTED_MODULE_0__[\"default\"])({\n        key: \"css\"\n    });\n};\n\n__webpack_async_result__();\n} catch(e) { __webpack_async_result__(e); } });//# sourceURL=[module]\n//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiLi9zcmMvdXRpbHMvY3JlYXRlRW1vdGlvbkNhY2hlLnRzIiwibWFwcGluZ3MiOiI7Ozs7Ozs7O0FBQXlDO0FBRWxDLE1BQU1DLHFCQUFxQjtJQUNoQyxPQUFPRCwwREFBV0EsQ0FBQztRQUFFRSxLQUFLO0lBQU07QUFDbEMsRUFBRSIsInNvdXJjZXMiOlsid2VicGFjazovL3RlbGVkcml2ZS1jbGllbnQvLi9zcmMvdXRpbHMvY3JlYXRlRW1vdGlvbkNhY2hlLnRzP2ViYzYiXSwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IGNyZWF0ZUNhY2hlIGZyb20gJ0BlbW90aW9uL2NhY2hlJztcclxuXHJcbmV4cG9ydCBjb25zdCBjcmVhdGVFbW90aW9uQ2FjaGUgPSAoKSA9PiB7XHJcbiAgcmV0dXJuIGNyZWF0ZUNhY2hlKHsga2V5OiAnY3NzJyB9KTtcclxufTsgIl0sIm5hbWVzIjpbImNyZWF0ZUNhY2hlIiwiY3JlYXRlRW1vdGlvbkNhY2hlIiwia2V5Il0sInNvdXJjZVJvb3QiOiIifQ==\n//# sourceURL=webpack-internal:///./src/utils/createEmotionCache.ts\n");

/***/ }),

/***/ "./src/styles/globals.css":
/*!********************************!*\
  !*** ./src/styles/globals.css ***!
  \********************************/
/***/ (() => {



/***/ }),

/***/ "@mui/material/CssBaseline":
/*!********************************************!*\
  !*** external "@mui/material/CssBaseline" ***!
  \********************************************/
/***/ ((module) => {

"use strict";
module.exports = require("@mui/material/CssBaseline");

/***/ }),

/***/ "@mui/material/styles":
/*!***************************************!*\
  !*** external "@mui/material/styles" ***!
  \***************************************/
/***/ ((module) => {

"use strict";
module.exports = require("@mui/material/styles");

/***/ }),

/***/ "react":
/*!************************!*\
  !*** external "react" ***!
  \************************/
/***/ ((module) => {

"use strict";
module.exports = require("react");

/***/ }),

/***/ "react/jsx-dev-runtime":
/*!****************************************!*\
  !*** external "react/jsx-dev-runtime" ***!
  \****************************************/
/***/ ((module) => {

"use strict";
module.exports = require("react/jsx-dev-runtime");

/***/ }),

/***/ "@emotion/cache":
/*!*********************************!*\
  !*** external "@emotion/cache" ***!
  \*********************************/
/***/ ((module) => {

"use strict";
module.exports = import("@emotion/cache");;

/***/ }),

/***/ "@emotion/react":
/*!*********************************!*\
  !*** external "@emotion/react" ***!
  \*********************************/
/***/ ((module) => {

"use strict";
module.exports = import("@emotion/react");;

/***/ }),

/***/ "react-toastify":
/*!*********************************!*\
  !*** external "react-toastify" ***!
  \*********************************/
/***/ ((module) => {

"use strict";
module.exports = import("react-toastify");;

/***/ })

};
;

// load runtime
var __webpack_require__ = require("../webpack-runtime.js");
__webpack_require__.C(exports);
var __webpack_exec__ = (moduleId) => (__webpack_require__(__webpack_require__.s = moduleId))
var __webpack_exports__ = __webpack_require__.X(0, ["vendor-chunks/react-toastify"], () => (__webpack_exec__("./src/pages/_app.tsx")));
module.exports = __webpack_exports__;

})();