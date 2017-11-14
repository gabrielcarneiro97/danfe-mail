# DANFE-MAIL

Serviço que faz acesso a um e-mail e faz download das notas fiscais anexadas enviadas para uma caixa especifica. As notas são guardadas em uma pasta com o nome da empresa.

## Instruções de configuração.

**Todas as constantes estão registradas no arquivo _config.js_.**

O e-mail, a senha e o diretório para a onde as notas serão salvas devem ser salvos cada um em uma Environment Variable, sendo o e-mail na constante _email_, a senha na constante _passEmail_ e o diretório na constante _fullDir_.

O IMAP está configurado para acessar um e-mail gmail, essas informações podem ser trocadas no arquivo _check.js_, alterando as informações na variável _imap_. 
**OBS:** deve ser feito a liberação de aplicações menos seguras, link de instruções: https://support.google.com/accounts/answer/6010255?hl=pt-BR

O serviço está configurado para olhar apenas a caixa "Notas", deve-se configurar o e-mail para que ele direcione as notas para essa caixa, ou se preferir trocar na linha 34 do arquivo _check.js_ para a caixa desejada. 
**Alerta!:** observe que o check será feito em todos os e-mails da caixa referenciada, por isso é recomendado que as notas sejam direcionadas para uma caixa especifica para evitar bugs.

O serviço está configurado para verificar os últimos 10 e-mails da caixa referenciada a cada minuto, para mudar o tempo deve-se mudar a constante _interval_, observando que o tempo está em segundos. Para trocar o número de e-mails verificados, trocar a constante _checkNum_ para o número de mensagens desejado. Para checar toda a caixa conferir instruções na linha 39 do arquivo _check.js_.

## Instruções de envio de notas (_check.js_).

As notas devem ser enviadas um e-mail por nota contendo o .xml e o .pdf em anexo na mesma mensagem, o assunto da mensagem deve ser: "NFe - #{número da nota} - #{nome da empresa}", exemplo: "NFe - 00001 - REVENDA DE CARRINHOS RADICAIS".

Mensagens no corpo do e-mail são ignoradas.

## Instruções de envio de notas (_check2.js_).

As notas devem ser enviadas um e-mail por nota contendo o .xml e o .pdf em anexo na mesma mensagem, o assunto da mensagem deve ser: "Nota Fiscal número #{número da nota} emitida por #{nome da empresa}", exemplo: "Nota Fiscal número 00001 emitida por REVENDA DE CARRINHOS RADICAIS".

Mensagens no corpo do e-mail são ignoradas.