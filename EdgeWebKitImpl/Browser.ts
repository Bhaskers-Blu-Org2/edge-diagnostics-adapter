﻿//
// Copyright (C) Microsoft. All rights reserved.
//

/// <reference path="Interfaces.d.ts"/>
/// <reference path="Edge.DiagnosticOM.d.ts" />

module IEDiagnosticsAdapter {
    "use strict";

    declare var host: any; // todo: create some interface for host
    declare var request: any; // todo: create some interface for request

    declare var browser: DiagnosticsOM.IBrowser;
    export class BrowserHandler {
        private _windowExternal: any; // todo: Make an appropriate TS interface for external

        constructor() {
            this._windowExternal = (<any>external);
            this._windowExternal.addEventListener("message", (e: any) => this.messageHandler(e));
            this.addNavigateListener();
            this.addBeforeScriptExecuteListener();

            browser.addEventListener("documentComplete", (dispatchWindow: any) => {
                // Whenever we navigate, we need to add the unload listener to the new document
                this.addNavigateListener();
            });
        }

        public postResponse(id: number, value: IWebKitResult): void {
            // Send the response back over the websocket
            var response: IWebKitResponse = Common.createResponse(id, value);
            this._windowExternal.sendMessage("postMessage", JSON.stringify(response));
        }

        public postNotification(method: string, params: any): void {
            var notification: IWebKitNotification;
            if (params) {
                notification = {
                    method: method,
                    params: params
                };
            } else {
                notification = {
                    method: method
                };
            }

            this._windowExternal.sendMessage("postMessage", JSON.stringify(notification)); // todo: should this be postMessage?
        }

        private addNavigateListener(): void {
            browser.document.defaultView.addEventListener("unload", (e: any) => {
                pageHandler.onNavigate();
                domHandler.onNavigate();
            });
        }

        private addBeforeScriptExecuteListener(): void {
            browser.addEventListener("beforeScriptExecute", (dispatchWindow: any) => {
                // Grab the document - IWebBrowser2 uses "Document" while
                // IWebApplicationHost actually passes us the window which uses "document".

                var realWindow: Window;
                try {
                    // Try to get the window object that javascript expects
                    if (dispatchWindow) {
                        realWindow = dispatchWindow.document.defaultView;
                    } else {
                        realWindow = browser.document.defaultView;
                    }

                } catch (ex) {
                    // Ignore this beforeScriptExecute, as the window is not valid and cannot attach a console
                    return;
                }

                // Ensure the new window is the top level one and not a sub frame
                if (realWindow === browser.document.defaultView) {
                    this._windowExternal.sendMessage('postMessage', JSON.stringify(browser.document.location));
                }
            });
        }

        private alert(message: string): void {
            this._windowExternal.sendMessage("alert", message);
        }

        private messageHandler(e: any): void {
            if (e.id === "onmessage") {
                // Try to parse the requested command
                var request = null;
                try {
                    request = JSON.parse(e.data);
                } catch (ex) {
                    this.postResponse(0, {
                        error: { description: "Invalid request" }
                    });
                    return;
                }

                // Process a successful request on the correct thread
                if (request) {
                    var methodParts = request.method.split(".");

                    // browser.document.parentWindow.alert(e.data);
                    switch (methodParts[0]) {
                        case "Custom":
                            switch (methodParts[1]) {
                                case "toolsDisconnected":
                                    IEDiagnosticsAdapter.pageHandler.onNavigate();
                                    IEDiagnosticsAdapter.domHandler.onNavigate();
                                    break;
                                case "testResetState":
                                    IEDiagnosticsAdapter.pageHandler.onNavigate();
                                    IEDiagnosticsAdapter.domHandler.resetState();
                                    break;
                            }

                            break;

                        case "Runtime":
                            runtimeHandler.processMessage(methodParts[1], request);
                            break;

                        case "Page":
                            pageHandler.processMessage(methodParts[1], request);
                            break;

                        case "DOM":
                        case "CSS":
                            domHandler.processMessage(methodParts[1], request);
                            break;

                        case "Worker":
                            if (methodParts[1] === "canInspectWorkers") {
                                var processedResult: IWebKitResult = { result: false };
                                browserHandler.postResponse(request.id, processedResult);
                            }

                            break;

                        case "BrowserTool":
                            browserToolHandler.processMessage(methodParts[1], request);
                            break;

                        default:
                            this.postResponse(request.id, {});
                            break;
                    }
                }
            } else if (e.id === "onnavigation") {
                this.postNotification("Page.frameNavigated", {
                    frame: {
                        id: "1500.1",
                        url: browser.document.location.href,
                        mimeType: (<any>browser.document).contentType,
                        securityOrigin: (<any>browser.document.location).origin
                    }
                });
            }
        }
    }

    export var browserHandler: BrowserHandler = new BrowserHandler();
}