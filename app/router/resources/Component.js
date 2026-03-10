sap.ui.define([
    "sap/ui/core/UIComponent",
    "sap/ui/core/HTML"
], function (UIComponent, HTML) {
    "use strict";

    return UIComponent.extend("cnma.internalprediction.Component", {
        metadata: {
            manifest: "json"
        },

        init: function () {
            UIComponent.prototype.init.apply(this, arguments);
            this._setupIframeMessaging();
        },

        createContent: function () {
            var sAppPath = sap.ui.require.toUrl("cnma/internalprediction");
            var sIndexUrl = sAppPath + "/index.html";

            // Store iframe reference for later messaging
            var that = this;
            var sIframeId = "reactAppIframe-" + Date.now();

            setTimeout(function () {
                that._iframe = document.getElementById(sIframeId);
                // Send initial state once iframe is loaded
                if (that._iframe) {
                    that._iframe.addEventListener('load', function () {
                        that._sendInitialStateToIframe();
                    });
                }
            }, 100);

            // Return a UI5 HTML Control that contains an IFrame
            return new HTML({
                content: '<iframe id="' + sIframeId + '" src="' + sIndexUrl + '" style="width:100%; height:100%; border:none; display:block;"></iframe>'
            });
        },

        _setupIframeMessaging: function () {
            var that = this;

            // Listen for messages from React app iframe
            window.addEventListener('message', function (event) {
                // Security: In production, validate event.origin

                if (event.data && event.data.type === 'REQUEST_INITIAL_STATE') {
                    console.log('[UI5-Component] Received request for initial state');
                    that._sendInitialStateToIframe();
                } else if (event.data && event.data.type === 'ROUTE_CHANGE') {
                    console.log('[UI5-Component] Received route change:', event.data.route);
                    that._updateFLPHash(event.data.route);
                }
            });
        },

        _sendInitialStateToIframe: function () {
            if (!this._iframe || !this._iframe.contentWindow) {
                console.log('[UI5-Component] Iframe not ready yet');
                return;
            }

            // Use window.top to get the actual browser URL (top-level window)
            var targetWindow = window.top || window;
            var hash = targetWindow.location.hash || '';
            var search = targetWindow.location.search || '';

            console.log('[UI5-Component] Sending initial state to iframe - hash:', hash, 'search:', search);

            this._iframe.contentWindow.postMessage({
                type: 'INITIAL_STATE',
                hash: hash,
                search: search
            }, '*');
        },

        _updateFLPHash: function (route) {
            try {
                // Use window.top to update the actual browser address bar
                var targetWindow = window.top || window;
                var currentHash = targetWindow.location.hash;

                console.log('[UI5-Component] Current top-level hash:', currentHash);

                // FLP hash format: #app-name?sap-ui-app-id-hint=xxx&/innerRoute
                // Remove any existing inner route (&/...)
                var basePart = currentHash.split('&/')[0];

                // Construct new hash
                var newHash = route ? basePart + '&/' + route : basePart;

                // Only update if different
                if (currentHash !== newHash) {
                    console.log('[UI5-Component] Updating top-level FLP hash to:', newHash);

                    // Update the top-level window's URL
                    targetWindow.history.replaceState(null, '',
                        targetWindow.location.origin +
                        targetWindow.location.pathname +
                        targetWindow.location.search +
                        newHash
                    );

                    console.log('[UI5-Component] ✅ URL updated successfully');
                }
            } catch (e) {
                console.error('[UI5-Component] Failed to update hash:', e);
            }
        }
    });
});
