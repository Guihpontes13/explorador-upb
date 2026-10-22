# Estatísticas privadas de visitas

**Estado: preparada, desativada.** `dist/analytics.js` não faz nenhuma requisição enquanto `ACCOUNT_CODE` estiver vazio. Esta configuração não recupera visitas anteriores.

## Ativação pelo proprietário

1. Crie uma conta gratuita em https://www.goatcounter.com/signup e confirme o e-mail. Em Site domain, informe https://guihpontes13.github.io/explorador-upb/.
2. Nas configurações do GoatCounter, mantenha o painel **privado**, acessível somente após entrar na conta. Não habilite painel público, link compartilhável ou contador público.
3. Para contar apenas acessos, desative estatísticas opcionais de localização, navegador/sistema, idiomas e tamanho de tela. Deixe a coleta de pageviews individuais desativada.
4. Informe somente o código público da conta (o trecho antes de `.goatcounter.com`) em `ACCOUNT_CODE`. Nunca adicione senha ou token de API ao repositório.
5. Execute `node tests/analytics.cjs`, publique pelo workflow Pages existente e confira uma visita no painel privado. Bloqueadores podem impedir a contagem. A resposta opaca do navegador não comprova que a visita foi aceita: valide no painel.
6. Abra o painel diretamente no endereço fornecido pelo GoatCounter e entre na conta para ver os acessos por período. Não publique esse painel no site.

## Dados enviados

O contador envia uma requisição GET para o endpoint oficial /count do GoatCounter, uma vez quando a página fica visível. Envia apenas caminho e título fixos, referrer vazio e um valor transitório para evitar cache. Nenhum script de terceiros é carregado: o código do contador fica no próprio repositório.

Não lê planilhas, arquivos, nomes de amostras, seleções, gráficos, título variável, parâmetros de URL ou estado da aplicação. Não envia cookies nem o cabeçalho Referer; não grava identificadores no navegador. O serviço recebe necessariamente o IP e os cabeçalhos HTTP da conexão, conforme sua política de privacidade. O cálculo de visitantes únicos é uma estimativa do GoatCounter, não uma identificação de pessoas.

Só funciona no domínio e caminho definidos no arquivo. Cópias do site devem configurar sua própria origem, caminho e conta. Localhost, iframes, automação identificada, Do Not Track e Global Privacy Control são ignorados. O fragmento `#sem-estatisticas` permite abrir o explorador sem registrar essa visita. Não são contados cliques, uploads ou alterações de filtros.

Falhas do contador não interrompem a aplicação. Não há estatísticas históricas anteriores à ativação; bloqueadores e tráfego automatizado podem afetar os totais. A contagem não é faturamento nem uma medida exata de pessoas.

## Verificação

`node tests/analytics.cjs` testa a integração com requisições simuladas, sem acessar o GoatCounter. O teste cobre estado desativado, dados enviados, omissão de cookies/referrer, isolamento do domínio, contagem única ao tornar a aba visível, preferências de privacidade e falhas de rede.

## Fontes

- https://www.goatcounter.com/
- https://www.goatcounter.com/help/pixel
- https://www.goatcounter.com/help/privacy
- https://www.goatcounter.com/help/sessions
- https://www.goatcounter.com/help/faq
