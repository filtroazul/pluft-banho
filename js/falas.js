/* pluft no banho: todas as falas do jogo, num lugar só. */
(function () {
  const P = window.P;

  P.T = {
    autor: '',

    inicio: {
      sub: 'o pluft tá no banho.',
      botao: 'olhar',
      nota: 'com som, de preferência.',
    },

    cutucadas: [
      'ei, tô de toalha.',
      'para de me cutucar.',
      'vc é muito enxerida.',
      'tô molhado, sai daqui.',
      'tá bom, mais uma e acabou.',
    ],

    /* ---------- 1. o chuveiro ---------- */
    chuveiro: {
      titulo: '♪ art deco ♪',
      dica: 'estoure as bolhas com o dedo',
      oxe: 'AVE MARIA',
      sente: '...?',
    },

    /* ---------- 2. a toalha ---------- */
    toalha: {
      grito: 'AAAAAAAAH',
      l1: [
        'VC TÁ AÍ??',
        'tava olhando desde quando??',
        'ave maria. vc viu tudo?',
        'a bunda também??',
      ],
      l2: ['eu aqui cantando lana del rey pelado e vc vendo. que vergonha, pelo amor de deus.'],
      pedido: 'agora tapa essa câmera pelo menos.',
      dica: 'arraste a cortina pra tapar a câmera',
      atras: ['pronto, valeu.', 'agora vou me arrumar. não abre não.'],
      ainda: ['vc tá aí ainda?', 'fica aí que eu já vou.'],
    },

    /* ---------- 3. se arrumar ---------- */
    arrumar: {
      intro: [
        'pode olhar. só da cintura pra cima, viu?',
        'eu tô sem roupa e quero sair bonito. me ajuda a escolher.',
      ],
      dica: 'toque nas coisas pra ele se arrumar',
      gravata: 'gravata borboleta. chique.',
      flor: 'uma florzinha na lapela. eu nem tenho lapela, mas tá valendo.',
      perfume: 'psss. cheiroso.',
      cartola: 'cartola. agora sim.',
      bengala: 'e uma bengala. tô parecendo dono de cassino.',
      pesado: ['peraí.', 'tá pesado demais. eu nem consigo ficar em pé.', 'tira uns trem aí.'],
      dicaTira: 'toque na cartola e na bengala pra tirar',
      fica: 'essa fica. tá bonita.',
      tirou1: 'ahh, melhor.',
      tirou2: 'agora eu respiro.',
      leve: ['agora dá até pra andar.', 'olha como eu fiquei. de toalha e gravata, mas tô lindo.'],
    },

    /* ---------- 4. o espelho ---------- */
    espelho: {
      l1: ['tô bonito, né?', 'pera, deixa eu pegar o espelho pra ver direito.'],
      olha: ['...', 'nossa. que homem bonito.'],
      vira: ['mas eu não quero ver só eu.', 'vou virar o espelho pra vc.'],
      l2: [
        'parece que o vapor que saiu do banho foi um presságio digno de uma apresentação de um show que é você. você é um espetáculo! eu fiquei um tempo olhando e percebi isso faz tempo. você carrega tanta coisa nas costas que nem se dá de conta, e ainda assim permanece resiliente sob o mundao todo..',
        'eu sei que pra conquistar o que é seu você tira muito de você mesma.  um pouco de sono, um pouco de calma ( as vezes batante da sua calma, pois as outras pessoas não são complacentes contigo ). e apesar de se arrastar muitas vezes, você só prossegue. eu creio que todas as recompensas que lhe caibam irão chegar e não terá dia melhor do que esse quando finalmente chegar.',
        'e desistir de algo não lhe faz menor, pois sim é necessário dar um passo pra trás pra dar um salto enorme. então parabéns pelos mínimos esforços e mínimas vitórias que você vem conquistando dia após dia. eu te considero uma verdadeira campeã em todas as áreas que você atua',
      ],
      fecha: 'e se um dia houver qualquer duvida da sua capacidade, olha pra esse espelho de novo. pois será repetido milhares de vezes que você é fenomenal e que se o seu mundinho cair, você não vai estar só.',
    },

    fim: {
      titulo: 'fim.',
      oficial: 'o tempo pode demorar a trazer o que você realmente merece, mas isto vai chegar. pois você é digna e eu acredito muito em você! você é muito especial e eu quero estar na sua jornada até você conseguir tudo que sempre quis.',
      credito: 'eu te amo e quero comemorar cada etapa com você, e quero ver esse sorriso lindo no seu rosto q nenhum outro ser replica :]',
      de_novo: 'de novo?',
    },
  };
})();
