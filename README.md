# Explorador U–Pb

Generic client-only explorer of U–Pb data. Uploaded files remain in browser memory; reload clears them. Bundled examples simulate Plešovice, GJ-1 and 91500 using published age centres, invented spot identifiers and generated measurements. Plotly and SheetJS are bundled locally.

Run: `python -m http.server 8080 --directory dist`. Tests: `node test.cjs`.

## Publicar no GitHub Pages

O site é estático: todo o processamento das planilhas ocorre no navegador, com JavaScript, Plotly e SheetJS locais. Não precisa de servidor de aplicação, banco de dados, chaves de API ou serviços do ChatGPT. Os caminhos dos arquivos são relativos e funcionam tanto na raiz de um domínio como em uma subpasta de projeto.

1. Crie ou selecione um repositório, por exemplo `explorador-upb`. No GitHub Free, o repositório deve ser público para utilizar Pages.
2. Envie o conteúdo deste código-fonte à raiz do repositório na branch `main`, incluindo `dist/`, `scripts/` e `.github/workflows/pages.yml`. O pacote `dist/source.zip` inclui esses arquivos e não inclui histórico Git, credenciais, configuração da hospedagem anterior nem planilhas de usuários.
3. Em **Settings → Pages → Build and deployment → Source**, selecione **GitHub Actions**.
4. Em **Actions**, execute **Publicar Explorador U-Pb no GitHub Pages**, ou envie um novo commit à branch `main`. Se a branch padrão tiver outro nome, altere `branches: [main]` no workflow. O workflow só publica a branch padrão.
5. Aguarde a execução terminar. O endereço aparece em **Settings → Pages** e no resultado da implantação; normalmente será `https://SEU-USUARIO.github.io/explorador-upb/`.

O workflow atualiza `source.zip` e publica apenas `dist/`. O exemplo incluído é sintético; planilhas carregadas na interface não são enviadas ao repositório. O endereço gratuito contém o nome da conta ou organização. Um domínio próprio pode ser configurado separadamente em Pages; essa configuração e o DNS não estão incluídos neste código. Migrar a hospedagem não redireciona nem desativa automaticamente o endereço anterior.

Documentação oficial: [GitHub Pages](https://docs.github.com/pt/pages/getting-started-with-github-pages/what-is-github-pages), [configurar a origem de publicação](https://docs.github.com/pt/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site) e [workflows de publicação](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages).

## Synthetic zircon standards

The default and restored demo contains 80 simulated analyses each of Plešovice, GJ-1 and 91500 (240 total). Age centres in Ma are: Plešovice t68=337.13 (Sláma et al., 2008, doi:10.1016/j.chemgeo.2007.11.005), with t76=337.13 explicitly assumed only for a concordant simulation; GJ-1 t68=600.4/t76=608.6 (Jackson et al., 2004 as reported in Bühn et al., 2009, doi:10.1590/S0001-37652009000100011); 91500 t68=1062.4/t76=1065.4 (Wiedenbeck et al., 1995 as discussed in Schoene et al., 2006, section 3.7, doi:10.1016/j.gca.2005.09.007). These are explicitly selected demonstration centres, not universal calibration recommendations. The site lists all sources and the distinction between published and assumed values.

Central ratios are computed as y0=expm1(lambda238*t68), x0=y0*expm1(lambda235*t76)/expm1(lambda238*t76). A deterministic LCG (seed 91500, multiplier 1664525, increment 1013904223, modulus 2^32) and Box–Muller transform generate bivariate normal scatter, with 1-sigma relative uncertainty 1.5% in x and 1% in y, rho=0.6. These uncertainties and rho are illustrative choices, not published standard errors. No common Pb, forced outliers, non-zircon flags or invented depths are added. Ages and uncertainties are derived through the normal app code; filters determine classifications. Simulation flags and adopted age centres are retained in analysis CSV exports. The sample CSV contains three simulated spots per standard and explicit synthetic-data comments. Uploaded files still use the existing reference-material exclusion option.

## Input

XLSX, XLS and CSV. One analysis per row. Map each sheet's columns and declare common-Pb stage and uncertainty convention. Recommended columns: `id`, `sample`, `grupo`, optional `depth`, `r75`, `sx`, `r68`, `sy`, `rho` (Wetherill). `sx_abs1` and `sy_abs1` explicitly identify absolute 1-sigma errors in the downloadable model. Optional ages in Ma: `t68/e68`, `t76/e76`, `best/bestError`. Optional imported discordance: `dc/pConc`. Optional flags: `nao_zircao`, `nao_usar` (1/sim/true/x means true).

Repeated laboratory headers are resolved using adjacent error labels. Ratio percent errors and absolute age errors are detected independently (e.g. 1σ% and 2σ absolute). Explicit sample/group/depth columns take priority. A recognizable sheet name or an identifier such as POC07_1250 - 1.FIN2 can provide sample, well and depth in metres; otherwise use sheet name, “Sem grupo”, and line number. Metadata-only acquisition settings are skipped. Known reference materials and explicit “não usar” comments can be excluded at import. Identity conflicts in comments are reported, never used to overwrite sample metadata. Duplicate group/sample/id keys are retained and reported. No mineral identity is inferred from missing data. Non-zircon and explicitly excluded analyses never enter the KDE.

## KDE display modes

The KDE tab offers overlaid curves, separate vertically arranged charts, and one sample at a time. All modes keep the same selected data, filters, bandwidth and per-sample normalization. Initial age and density scales are shared across the selected samples; switching to individual mode retains the comparison selection while counts, table and analysis CSV describe the displayed sample. Separate charts are real independent Plotly figures with individual SVG/PNG exports, sample/depth labels, counts and current bandwidth. They follow shallow-to-deep sample order and retain empty samples as explicit no-data panels. Zoom is independent per chart; changing the selection or parameters restores shared scales.

## Concordia display modes

The Wetherill tab offers all selected samples together, separate vertically arranged charts, and one sample at a time. Each sample retains the same classifications, original ratios and 95% uncertainty ellipses. Adaptive framing follows the visible points and valid ellipses within each chart; axes can differ between sample charts. The individual selector retains the comparison selection while counts, table and analysis CSV describe the displayed sample. Separate charts have independent zoom, SVG/PNG exports, sample/depth labels and point/ellipse counts. They follow shallow-to-deep order, with unknown depths last, and show an explicit message when a sample has no visible valid ratios. KDE and concordia display preferences are independent; KDE age/status selection never hides concordia points.

## Numerical scope

Equilibrium Wetherill ratios, lambda235 = 9.8485e-10/year, lambda238 = 1.55125e-10/year, U238/U235 = 137.818. No decay-constant uncertainty, disequilibrium, discordia regression, or correction of plotted measurements. 95% joint ellipses use chi-square(2) = 5.991464547 and the supplied covariance. Missing/invalid covariance suppresses ellipses and covariance-dependent metrics.

Discordance definitions t, r, a, c and sk follow IsoplotR 7.0.1, reference commit dadd830f8e4d1e90220de55dbb2e80f35e7235f0. The IsoplotR combined rule is p > alpha OR low < discordance < high. A limits-only rule is also offered. Initial dc limits -3.5/+4.6 are custom, not universal defaults. Other default limits follow IsoplotR. Imported dc and prepared classifications are separate modes. The importer selects prepared classifications (e.g. Filtro Vermeesch 2021) first, otherwise numeric dc, when the matching option is enabled. Unknown status never implies non-zircon. The correction stage can be changed after importing; it is never inferred from a filename. All calculated pre-correction filters require an explicit raw-stage declaration. SK is limited to input without 204Pb, as described on the page.

Age switch uses the IsoplotR GUI label “t(6/8) → t(7/6) @” and parameter cutoff.76. Default 1200 Ma with t68 > cutoff selecting t76; an alternative t76 >= cutoff reference is explicit. Supplied ages take precedence; absent ages are derived when possible. Gaussian KDE bandwidth defaults to 20 Ma and is editable. No 4000 Ma age rejection. Automatic or manual display interval does not remove observations from the normalization. Grid initially min(2 Ma, h/5), capped at 20001 points; Gaussian contributions truncated after 8h. No boundary correction. Population intervals default to a shared adaptive grid based on all selected eligible ages (independent of the KDE display window). The span/16 is rounded up to a 1, 2, 2.5, 5 or 10 × 10^n Ma step; a single age uses max(2% of age, 1 Ma) before rounding. Grid edges cover the minimum and strictly exceed the maximum, with no 4000 Ma cap. Each age is counted once, using lower-inclusive and upper-exclusive bounds. All compared samples share the grid and percentages use each sample’s total eligible count. Sample selectors, comparison axes, legends, import previews and summary tables sort known depths from shallow to deep, with unknown depths last and well/sample names breaking ties. Available depths appear in sample labels. Population and KDE captions show the active KDE bandwidth; the population heatmap uses unsmoothed counts and is independent of bandwidth. Users can disable adaptive intervals or apply their own named intervals; these manual reference bands remain independent of the adaptive grid. SVG/PNG exports preserve the active population grid and state its width/range.

Concordia fit minimizes the Wetherill likelihood on 0–10000 Ma, with a scalar golden-section optimizer; the IsoplotR L-BFGS-B optimizer may show small differences. The t76 inverse searches 0.0001–10000 Ma. Boundary solutions are not reliable geological age constraints. These numerical domains are separate from the unrestricted KDE input ages.

## Verification and license

Scientific fixtures compare against the actual R source at the commit above. Browser checks cover raw/unknown-stage CSV import, filter switching, sample/group selection, ages >4000 Ma, intervals, SVG/PNG/CSV exports, and mobile overflow. No user data are included in the source bundle.

Application: GPL-3.0-or-later, including numeric adaptations credited in filters.js. Plotly: MIT. SheetJS: Apache-2.0. Corresponding app source is available at source.zip; vendor licenses are in dist/vendor. Scientific references and current parameters are visible on the site.
