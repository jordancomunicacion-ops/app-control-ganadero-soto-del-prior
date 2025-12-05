$content = Get-Content "index.html" -Raw

$sigpacHTML = @"
                                <input type="hidden" id="farmEditId">
                                
                                <!-- SIGPAC SEARCH -->
                                <div style="background: linear-gradient(135deg, #e7f7ee, #f8fafc); border: 2px solid #bbebd1; border-radius: 12px; padding: 16px; margin-bottom: 16px;">
                                    <h4 style="margin: 0 0 8px; color: #15803d;">🔍 Buscar en SIGPAC</h4>
                                    <p style="margin: 0 0 12px; font-size: 13px; color: #6b7280;">Introduce la referencia catastral para autocompletar datos</p>
                                    <div style="display: grid; grid-template-columns: 1fr auto; gap: 8px;">
                                        <label style="margin: 0;">Referencia Catastral
                                            <input type="text" id="sigpacRef" placeholder="Ej: 37900A00100001">
                                        </label>
                                        <button type="button" class="primary" id="searchSigpacBtn" style="align-self: end;">🔍 Buscar</button>
                                    </div>
                                    <div id="sigpacLoading" class="hidden" style="margin-top: 12px; display: flex; align-items: center; gap: 8px; color: #6b7280;">
                                        <div style="width: 16px; height: 16px; border: 2px solid #22c55e; border-top-color: transparent; border-radius: 50%; animation: spin 1s linear infinite;"></div>
                                        <span>Consultando SIGPAC...</span>
                                    </div>
                                    <div id="sigpacStatus" class="hidden" style="margin-top: 12px; padding: 10px; border-radius: 8px; font-size: 14px;"></div>
                                </div>

                                <label>Nombre de la finca
"@

$content = $content -replace '                                <input type="hidden" id="farmEditId">\r?\n                                <label>Nombre de la finca', $sigpacHTML

$content | Out-File -Encoding UTF8 "index.html"
