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
/***/ ((module, __webpack_exports__, __webpack_require__) => {

eval("__webpack_require__.a(module, async (__webpack_handle_async_dependencies__, __webpack_async_result__) => { try {\n__webpack_require__.r(__webpack_exports__);\n/* harmony export */ __webpack_require__.d(__webpack_exports__, {\n/* harmony export */   \"default\": () => (__WEBPACK_DEFAULT_EXPORT__)\n/* harmony export */ });\n/* harmony import */ var react_jsx_dev_runtime__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! react/jsx-dev-runtime */ \"react/jsx-dev-runtime\");\n/* harmony import */ var react_jsx_dev_runtime__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(react_jsx_dev_runtime__WEBPACK_IMPORTED_MODULE_0__);\n/* harmony import */ var react__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! react */ \"react\");\n/* harmony import */ var react__WEBPACK_IMPORTED_MODULE_1___default = /*#__PURE__*/__webpack_require__.n(react__WEBPACK_IMPORTED_MODULE_1__);\n/* harmony import */ var next_document__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! next/document */ \"./node_modules/next/document.js\");\n/* harmony import */ var next_document__WEBPACK_IMPORTED_MODULE_2___default = /*#__PURE__*/__webpack_require__.n(next_document__WEBPACK_IMPORTED_MODULE_2__);\n/* harmony import */ var _emotion_server__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! @emotion/server */ \"@emotion/server\");\n/* harmony import */ var _utils_createEmotionCache__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(/*! ../utils/createEmotionCache */ \"./src/utils/createEmotionCache.ts\");\nvar __webpack_async_dependencies__ = __webpack_handle_async_dependencies__([_emotion_server__WEBPACK_IMPORTED_MODULE_3__, _utils_createEmotionCache__WEBPACK_IMPORTED_MODULE_4__]);\n([_emotion_server__WEBPACK_IMPORTED_MODULE_3__, _utils_createEmotionCache__WEBPACK_IMPORTED_MODULE_4__] = __webpack_async_dependencies__.then ? (await __webpack_async_dependencies__)() : __webpack_async_dependencies__);\n\n\n\n\n\nclass MyDocument extends (next_document__WEBPACK_IMPORTED_MODULE_2___default()) {\n    static async getInitialProps(ctx) {\n        const originalRenderPage = ctx.renderPage;\n        // Tạo cache instance\n        const cache = (0,_utils_createEmotionCache__WEBPACK_IMPORTED_MODULE_4__.createEmotionCache)();\n        ctx.renderPage = ()=>originalRenderPage({\n                enhanceApp: (App)=>(props)=>/*#__PURE__*/ (0,react_jsx_dev_runtime__WEBPACK_IMPORTED_MODULE_0__.jsxDEV)(App, {\n                            emotionCache: cache,\n                            ...props\n                        }, void 0, false, {\n                            fileName: \"C:\\\\VF\\\\TeleDrive\\\\client\\\\src\\\\pages\\\\_document.tsx\",\n                            lineNumber: 15,\n                            columnNumber: 46\n                        }, this)\n            });\n        const initialProps = await next_document__WEBPACK_IMPORTED_MODULE_2___default().getInitialProps(ctx);\n        // Trích xuất CSS\n        const { ids, css } = await (0,_emotion_server__WEBPACK_IMPORTED_MODULE_3__.renderStatic)(()=>{\n            return initialProps.html;\n        });\n        return {\n            ...initialProps,\n            styles: [\n                ...react__WEBPACK_IMPORTED_MODULE_1___default().Children.toArray(initialProps.styles),\n                /*#__PURE__*/ (0,react_jsx_dev_runtime__WEBPACK_IMPORTED_MODULE_0__.jsxDEV)(\"style\", {\n                    \"data-emotion\": `css ${ids.join(\" \")}`,\n                    dangerouslySetInnerHTML: {\n                        __html: css\n                    }\n                }, \"emotion\", false, {\n                    fileName: \"C:\\\\VF\\\\TeleDrive\\\\client\\\\src\\\\pages\\\\_document.tsx\",\n                    lineNumber: 29,\n                    columnNumber: 9\n                }, this)\n            ]\n        };\n    }\n    render() {\n        return /*#__PURE__*/ (0,react_jsx_dev_runtime__WEBPACK_IMPORTED_MODULE_0__.jsxDEV)(next_document__WEBPACK_IMPORTED_MODULE_2__.Html, {\n            lang: \"vi\",\n            children: [\n                /*#__PURE__*/ (0,react_jsx_dev_runtime__WEBPACK_IMPORTED_MODULE_0__.jsxDEV)(next_document__WEBPACK_IMPORTED_MODULE_2__.Head, {\n                    children: [\n                        /*#__PURE__*/ (0,react_jsx_dev_runtime__WEBPACK_IMPORTED_MODULE_0__.jsxDEV)(\"meta\", {\n                            charSet: \"utf-8\"\n                        }, void 0, false, {\n                            fileName: \"C:\\\\VF\\\\TeleDrive\\\\client\\\\src\\\\pages\\\\_document.tsx\",\n                            lineNumber: 42,\n                            columnNumber: 11\n                        }, this),\n                        /*#__PURE__*/ (0,react_jsx_dev_runtime__WEBPACK_IMPORTED_MODULE_0__.jsxDEV)(\"meta\", {\n                            name: \"theme-color\",\n                            content: \"#2AABEE\"\n                        }, void 0, false, {\n                            fileName: \"C:\\\\VF\\\\TeleDrive\\\\client\\\\src\\\\pages\\\\_document.tsx\",\n                            lineNumber: 43,\n                            columnNumber: 11\n                        }, this),\n                        /*#__PURE__*/ (0,react_jsx_dev_runtime__WEBPACK_IMPORTED_MODULE_0__.jsxDEV)(\"meta\", {\n                            name: \"description\",\n                            content: \"Lưu trữ đ\\xe1m m\\xe2y kh\\xf4ng giới hạn bằng Telegram\"\n                        }, void 0, false, {\n                            fileName: \"C:\\\\VF\\\\TeleDrive\\\\client\\\\src\\\\pages\\\\_document.tsx\",\n                            lineNumber: 44,\n                            columnNumber: 11\n                        }, this),\n                        /*#__PURE__*/ (0,react_jsx_dev_runtime__WEBPACK_IMPORTED_MODULE_0__.jsxDEV)(\"link\", {\n                            rel: \"icon\",\n                            href: \"/favicon.ico\"\n                        }, void 0, false, {\n                            fileName: \"C:\\\\VF\\\\TeleDrive\\\\client\\\\src\\\\pages\\\\_document.tsx\",\n                            lineNumber: 45,\n                            columnNumber: 11\n                        }, this),\n                        /*#__PURE__*/ (0,react_jsx_dev_runtime__WEBPACK_IMPORTED_MODULE_0__.jsxDEV)(\"link\", {\n                            rel: \"apple-touch-icon\",\n                            href: \"/logo192.png\"\n                        }, void 0, false, {\n                            fileName: \"C:\\\\VF\\\\TeleDrive\\\\client\\\\src\\\\pages\\\\_document.tsx\",\n                            lineNumber: 46,\n                            columnNumber: 11\n                        }, this),\n                        /*#__PURE__*/ (0,react_jsx_dev_runtime__WEBPACK_IMPORTED_MODULE_0__.jsxDEV)(\"link\", {\n                            rel: \"stylesheet\",\n                            href: \"https://fonts.googleapis.com/css?family=Roboto:300,400,500,700&display=swap\"\n                        }, void 0, false, {\n                            fileName: \"C:\\\\VF\\\\TeleDrive\\\\client\\\\src\\\\pages\\\\_document.tsx\",\n                            lineNumber: 47,\n                            columnNumber: 11\n                        }, this)\n                    ]\n                }, void 0, true, {\n                    fileName: \"C:\\\\VF\\\\TeleDrive\\\\client\\\\src\\\\pages\\\\_document.tsx\",\n                    lineNumber: 41,\n                    columnNumber: 9\n                }, this),\n                /*#__PURE__*/ (0,react_jsx_dev_runtime__WEBPACK_IMPORTED_MODULE_0__.jsxDEV)(\"body\", {\n                    children: [\n                        /*#__PURE__*/ (0,react_jsx_dev_runtime__WEBPACK_IMPORTED_MODULE_0__.jsxDEV)(next_document__WEBPACK_IMPORTED_MODULE_2__.Main, {}, void 0, false, {\n                            fileName: \"C:\\\\VF\\\\TeleDrive\\\\client\\\\src\\\\pages\\\\_document.tsx\",\n                            lineNumber: 53,\n                            columnNumber: 11\n                        }, this),\n                        /*#__PURE__*/ (0,react_jsx_dev_runtime__WEBPACK_IMPORTED_MODULE_0__.jsxDEV)(next_document__WEBPACK_IMPORTED_MODULE_2__.NextScript, {}, void 0, false, {\n                            fileName: \"C:\\\\VF\\\\TeleDrive\\\\client\\\\src\\\\pages\\\\_document.tsx\",\n                            lineNumber: 54,\n                            columnNumber: 11\n                        }, this)\n                    ]\n                }, void 0, true, {\n                    fileName: \"C:\\\\VF\\\\TeleDrive\\\\client\\\\src\\\\pages\\\\_document.tsx\",\n                    lineNumber: 52,\n                    columnNumber: 9\n                }, this)\n            ]\n        }, void 0, true, {\n            fileName: \"C:\\\\VF\\\\TeleDrive\\\\client\\\\src\\\\pages\\\\_document.tsx\",\n            lineNumber: 40,\n            columnNumber: 7\n        }, this);\n    }\n}\n/* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = (MyDocument);\n\n__webpack_async_result__();\n} catch(e) { __webpack_async_result__(e); } });//# sourceURL=[module]\n//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiLi9zcmMvcGFnZXMvX2RvY3VtZW50LnRzeCIsIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7O0FBQTBCO0FBQzhEO0FBQ3pDO0FBQ2tCO0FBRWpFLE1BQU1RLG1CQUFtQlAsc0RBQVFBO0lBQy9CLGFBQWFRLGdCQUFnQkMsR0FBb0IsRUFBRTtRQUNqRCxNQUFNQyxxQkFBcUJELElBQUlFLFVBQVU7UUFFekMscUJBQXFCO1FBQ3JCLE1BQU1DLFFBQVFOLDZFQUFrQkE7UUFFaENHLElBQUlFLFVBQVUsR0FBRyxJQUNmRCxtQkFBbUI7Z0JBQ2pCRyxZQUFZLENBQUNDLE1BQWEsQ0FBQ0Msc0JBQVUsOERBQUNEOzRCQUFJRSxjQUFjSjs0QkFBUSxHQUFHRyxLQUFLOzs7Ozs7WUFDMUU7UUFFRixNQUFNRSxlQUFlLE1BQU1qQixvRUFBd0IsQ0FBQ1M7UUFFcEQsaUJBQWlCO1FBQ2pCLE1BQU0sRUFBRVMsR0FBRyxFQUFFQyxHQUFHLEVBQUUsR0FBRyxNQUFNZCw2REFBWUEsQ0FBQztZQUN0QyxPQUFPWSxhQUFhRyxJQUFJO1FBQzFCO1FBRUEsT0FBTztZQUNMLEdBQUdILFlBQVk7WUFDZkksUUFBUTttQkFDSHRCLHFEQUFjLENBQUN3QixPQUFPLENBQUNOLGFBQWFJLE1BQU07OEJBQzdDLDhEQUFDRztvQkFFQ0MsZ0JBQWMsQ0FBQyxJQUFJLEVBQUVQLElBQUlRLElBQUksQ0FBQyxLQUFLLENBQUM7b0JBQ3BDQyx5QkFBeUI7d0JBQUVDLFFBQVFUO29CQUFJO21CQUZuQzs7Ozs7YUFJUDtRQUNIO0lBQ0Y7SUFFQVUsU0FBUztRQUNQLHFCQUNFLDhEQUFDNUIsK0NBQUlBO1lBQUM2QixNQUFLOzs4QkFDVCw4REFBQzVCLCtDQUFJQTs7c0NBQ0gsOERBQUM2Qjs0QkFBS0MsU0FBUTs7Ozs7O3NDQUNkLDhEQUFDRDs0QkFBS0UsTUFBSzs0QkFBY0MsU0FBUTs7Ozs7O3NDQUNqQyw4REFBQ0g7NEJBQUtFLE1BQUs7NEJBQWNDLFNBQVE7Ozs7OztzQ0FDakMsOERBQUNDOzRCQUFLQyxLQUFJOzRCQUFPQyxNQUFLOzs7Ozs7c0NBQ3RCLDhEQUFDRjs0QkFBS0MsS0FBSTs0QkFBbUJDLE1BQUs7Ozs7OztzQ0FDbEMsOERBQUNGOzRCQUNDQyxLQUFJOzRCQUNKQyxNQUFLOzs7Ozs7Ozs7Ozs7OEJBR1QsOERBQUNDOztzQ0FDQyw4REFBQ25DLCtDQUFJQTs7Ozs7c0NBQ0wsOERBQUNDLHFEQUFVQTs7Ozs7Ozs7Ozs7Ozs7Ozs7SUFJbkI7QUFDRjtBQUVBLGlFQUFlRyxVQUFVQSxFQUFDIiwic291cmNlcyI6WyJ3ZWJwYWNrOi8vdGVsZWRyaXZlLWNsaWVudC8uL3NyYy9wYWdlcy9fZG9jdW1lbnQudHN4PzE4OGUiXSwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IFJlYWN0IGZyb20gJ3JlYWN0JztcclxuaW1wb3J0IERvY3VtZW50LCB7IEh0bWwsIEhlYWQsIE1haW4sIE5leHRTY3JpcHQsIERvY3VtZW50Q29udGV4dCB9IGZyb20gJ25leHQvZG9jdW1lbnQnO1xyXG5pbXBvcnQgeyByZW5kZXJTdGF0aWMgfSBmcm9tICdAZW1vdGlvbi9zZXJ2ZXInO1xyXG5pbXBvcnQgeyBjcmVhdGVFbW90aW9uQ2FjaGUgfSBmcm9tICcuLi91dGlscy9jcmVhdGVFbW90aW9uQ2FjaGUnO1xyXG5cclxuY2xhc3MgTXlEb2N1bWVudCBleHRlbmRzIERvY3VtZW50IHtcclxuICBzdGF0aWMgYXN5bmMgZ2V0SW5pdGlhbFByb3BzKGN0eDogRG9jdW1lbnRDb250ZXh0KSB7XHJcbiAgICBjb25zdCBvcmlnaW5hbFJlbmRlclBhZ2UgPSBjdHgucmVuZGVyUGFnZTtcclxuICAgIFxyXG4gICAgLy8gVOG6oW8gY2FjaGUgaW5zdGFuY2VcclxuICAgIGNvbnN0IGNhY2hlID0gY3JlYXRlRW1vdGlvbkNhY2hlKCk7XHJcblxyXG4gICAgY3R4LnJlbmRlclBhZ2UgPSAoKSA9PlxyXG4gICAgICBvcmlnaW5hbFJlbmRlclBhZ2Uoe1xyXG4gICAgICAgIGVuaGFuY2VBcHA6IChBcHA6IGFueSkgPT4gKHByb3BzKSA9PiA8QXBwIGVtb3Rpb25DYWNoZT17Y2FjaGV9IHsuLi5wcm9wc30gLz4sXHJcbiAgICAgIH0pO1xyXG5cclxuICAgIGNvbnN0IGluaXRpYWxQcm9wcyA9IGF3YWl0IERvY3VtZW50LmdldEluaXRpYWxQcm9wcyhjdHgpO1xyXG4gICAgXHJcbiAgICAvLyBUcsOtY2ggeHXhuqV0IENTU1xyXG4gICAgY29uc3QgeyBpZHMsIGNzcyB9ID0gYXdhaXQgcmVuZGVyU3RhdGljKCgpID0+IHtcclxuICAgICAgcmV0dXJuIGluaXRpYWxQcm9wcy5odG1sO1xyXG4gICAgfSk7XHJcblxyXG4gICAgcmV0dXJuIHtcclxuICAgICAgLi4uaW5pdGlhbFByb3BzLFxyXG4gICAgICBzdHlsZXM6IFtcclxuICAgICAgICAuLi5SZWFjdC5DaGlsZHJlbi50b0FycmF5KGluaXRpYWxQcm9wcy5zdHlsZXMpLFxyXG4gICAgICAgIDxzdHlsZVxyXG4gICAgICAgICAga2V5PVwiZW1vdGlvblwiXHJcbiAgICAgICAgICBkYXRhLWVtb3Rpb249e2Bjc3MgJHtpZHMuam9pbignICcpfWB9XHJcbiAgICAgICAgICBkYW5nZXJvdXNseVNldElubmVySFRNTD17eyBfX2h0bWw6IGNzcyB9fVxyXG4gICAgICAgIC8+XHJcbiAgICAgIF0sXHJcbiAgICB9O1xyXG4gIH1cclxuXHJcbiAgcmVuZGVyKCkge1xyXG4gICAgcmV0dXJuIChcclxuICAgICAgPEh0bWwgbGFuZz1cInZpXCI+XHJcbiAgICAgICAgPEhlYWQ+XHJcbiAgICAgICAgICA8bWV0YSBjaGFyU2V0PVwidXRmLThcIiAvPlxyXG4gICAgICAgICAgPG1ldGEgbmFtZT1cInRoZW1lLWNvbG9yXCIgY29udGVudD1cIiMyQUFCRUVcIiAvPlxyXG4gICAgICAgICAgPG1ldGEgbmFtZT1cImRlc2NyaXB0aW9uXCIgY29udGVudD1cIkzGsHUgdHLhu68gxJHDoW0gbcOieSBraMO0bmcgZ2nhu5tpIGjhuqFuIGLhurFuZyBUZWxlZ3JhbVwiIC8+XHJcbiAgICAgICAgICA8bGluayByZWw9XCJpY29uXCIgaHJlZj1cIi9mYXZpY29uLmljb1wiIC8+XHJcbiAgICAgICAgICA8bGluayByZWw9XCJhcHBsZS10b3VjaC1pY29uXCIgaHJlZj1cIi9sb2dvMTkyLnBuZ1wiIC8+XHJcbiAgICAgICAgICA8bGlua1xyXG4gICAgICAgICAgICByZWw9XCJzdHlsZXNoZWV0XCJcclxuICAgICAgICAgICAgaHJlZj1cImh0dHBzOi8vZm9udHMuZ29vZ2xlYXBpcy5jb20vY3NzP2ZhbWlseT1Sb2JvdG86MzAwLDQwMCw1MDAsNzAwJmRpc3BsYXk9c3dhcFwiXHJcbiAgICAgICAgICAvPlxyXG4gICAgICAgIDwvSGVhZD5cclxuICAgICAgICA8Ym9keT5cclxuICAgICAgICAgIDxNYWluIC8+XHJcbiAgICAgICAgICA8TmV4dFNjcmlwdCAvPlxyXG4gICAgICAgIDwvYm9keT5cclxuICAgICAgPC9IdG1sPlxyXG4gICAgKTtcclxuICB9XHJcbn1cclxuXHJcbmV4cG9ydCBkZWZhdWx0IE15RG9jdW1lbnQ7ICJdLCJuYW1lcyI6WyJSZWFjdCIsIkRvY3VtZW50IiwiSHRtbCIsIkhlYWQiLCJNYWluIiwiTmV4dFNjcmlwdCIsInJlbmRlclN0YXRpYyIsImNyZWF0ZUVtb3Rpb25DYWNoZSIsIk15RG9jdW1lbnQiLCJnZXRJbml0aWFsUHJvcHMiLCJjdHgiLCJvcmlnaW5hbFJlbmRlclBhZ2UiLCJyZW5kZXJQYWdlIiwiY2FjaGUiLCJlbmhhbmNlQXBwIiwiQXBwIiwicHJvcHMiLCJlbW90aW9uQ2FjaGUiLCJpbml0aWFsUHJvcHMiLCJpZHMiLCJjc3MiLCJodG1sIiwic3R5bGVzIiwiQ2hpbGRyZW4iLCJ0b0FycmF5Iiwic3R5bGUiLCJkYXRhLWVtb3Rpb24iLCJqb2luIiwiZGFuZ2Vyb3VzbHlTZXRJbm5lckhUTUwiLCJfX2h0bWwiLCJyZW5kZXIiLCJsYW5nIiwibWV0YSIsImNoYXJTZXQiLCJuYW1lIiwiY29udGVudCIsImxpbmsiLCJyZWwiLCJocmVmIiwiYm9keSJdLCJzb3VyY2VSb290IjoiIn0=\n//# sourceURL=webpack-internal:///./src/pages/_document.tsx\n");

/***/ }),

/***/ "./src/utils/createEmotionCache.ts":
/*!*****************************************!*\
  !*** ./src/utils/createEmotionCache.ts ***!
  \*****************************************/
/***/ ((module, __webpack_exports__, __webpack_require__) => {

eval("__webpack_require__.a(module, async (__webpack_handle_async_dependencies__, __webpack_async_result__) => { try {\n__webpack_require__.r(__webpack_exports__);\n/* harmony export */ __webpack_require__.d(__webpack_exports__, {\n/* harmony export */   createEmotionCache: () => (/* binding */ createEmotionCache)\n/* harmony export */ });\n/* harmony import */ var _emotion_cache__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! @emotion/cache */ \"@emotion/cache\");\nvar __webpack_async_dependencies__ = __webpack_handle_async_dependencies__([_emotion_cache__WEBPACK_IMPORTED_MODULE_0__]);\n_emotion_cache__WEBPACK_IMPORTED_MODULE_0__ = (__webpack_async_dependencies__.then ? (await __webpack_async_dependencies__)() : __webpack_async_dependencies__)[0];\n\nconst createEmotionCache = ()=>{\n    return (0,_emotion_cache__WEBPACK_IMPORTED_MODULE_0__[\"default\"])({\n        key: \"css\"\n    });\n};\n\n__webpack_async_result__();\n} catch(e) { __webpack_async_result__(e); } });//# sourceURL=[module]\n//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiLi9zcmMvdXRpbHMvY3JlYXRlRW1vdGlvbkNhY2hlLnRzIiwibWFwcGluZ3MiOiI7Ozs7Ozs7O0FBQXlDO0FBRWxDLE1BQU1DLHFCQUFxQjtJQUNoQyxPQUFPRCwwREFBV0EsQ0FBQztRQUFFRSxLQUFLO0lBQU07QUFDbEMsRUFBRSIsInNvdXJjZXMiOlsid2VicGFjazovL3RlbGVkcml2ZS1jbGllbnQvLi9zcmMvdXRpbHMvY3JlYXRlRW1vdGlvbkNhY2hlLnRzP2ViYzYiXSwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IGNyZWF0ZUNhY2hlIGZyb20gJ0BlbW90aW9uL2NhY2hlJztcclxuXHJcbmV4cG9ydCBjb25zdCBjcmVhdGVFbW90aW9uQ2FjaGUgPSAoKSA9PiB7XHJcbiAgcmV0dXJuIGNyZWF0ZUNhY2hlKHsga2V5OiAnY3NzJyB9KTtcclxufTsgIl0sIm5hbWVzIjpbImNyZWF0ZUNhY2hlIiwiY3JlYXRlRW1vdGlvbkNhY2hlIiwia2V5Il0sInNvdXJjZVJvb3QiOiIifQ==\n//# sourceURL=webpack-internal:///./src/utils/createEmotionCache.ts\n");

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

/***/ }),

/***/ "@emotion/cache":
/*!*********************************!*\
  !*** external "@emotion/cache" ***!
  \*********************************/
/***/ ((module) => {

module.exports = import("@emotion/cache");;

/***/ }),

/***/ "@emotion/server":
/*!**********************************!*\
  !*** external "@emotion/server" ***!
  \**********************************/
/***/ ((module) => {

module.exports = import("@emotion/server");;

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