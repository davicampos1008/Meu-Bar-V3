import type { RecipeIngredient } from '../types/meubar';

export interface SeedRecipe {
  name: string;
  category: string;
  ingredients: RecipeIngredient[];
  steps: string;
  description: string;
  story: string;
  glass: string;
  technique: string;
  garnish: string;
  shaken: boolean;
  tags: string[];
}

export const EXTENDED_RECIPES: SeedRecipe[] = [
  {
    "name": "Old Fashioned",
    "category": "Clássicos",
    "ingredients": [
      {
        "n": "Whisky",
        "q": "60 ml (Bourbon)"
      },
      {
        "n": "Açúcar",
        "q": "1 torrão ou 10 ml xarope"
      },
      {
        "n": "Angostura",
        "q": "3 dashes"
      },
      {
        "n": "Laranja",
        "q": "1 casca"
      },
      {
        "n": "Gelo",
        "q": "1 cubo grande"
      }
    ],
    "steps": "1. Dissolva o açúcar com a Angostura e um fio de água no copo baixo.\n2. Adicione o gelo grande e o bourbon em etapas, mexendo devagar por 25 segundos.\n3. Perfume com casca de laranja.",
    "description": "Bourbon encorpado, açúcar, Angostura e óleos de casca de laranja.",
    "story": "O avô dos coquetéis. Nasceu no século XIX quando clientes em Louisville pediam um drink preparado “à moda antiga”, sem licores modernos.",
    "glass": "Old fashioned",
    "technique": "Mexido no copo",
    "garnish": "Casca de laranja e cereja",
    "shaken": false,
    "tags": [
      "Clássico",
      "Forte",
      "Curto",
      "Whisky"
    ]
  },
  {
    "name": "Negroni",
    "category": "Clássicos",
    "ingredients": [
      {
        "n": "Gin",
        "q": "30 ml"
      },
      {
        "n": "Campari",
        "q": "30 ml"
      },
      {
        "n": "Vermute",
        "q": "30 ml (Tinto)"
      },
      {
        "n": "Laranja",
        "q": "1 casca ou fatia"
      },
      {
        "n": "Gelo",
        "q": "1 cubo grande"
      }
    ],
    "steps": "1. Misture partes iguais de gin, Campari e vermute tinto em copo com gelo.\n2. Mexa por 25 segundos até gelar perfeitamente.\n3. Coe sobre gelo grande e decore com laranja.",
    "description": "Trindade italiana em partes iguais de gin, Campari e vermute tinto.",
    "story": "Criado em Florença em 1919 quando o conde Camillo Negroni pediu ao bartender Fosco Scarselli que reforçasse seu Americano trocando a água com gás por gin.",
    "glass": "Old fashioned",
    "technique": "Mexido",
    "garnish": "Meia fatia ou casca de laranja",
    "shaken": false,
    "tags": [
      "Clássico",
      "Amargo",
      "Forte",
      "Curto",
      "Gin"
    ]
  },
  {
    "name": "Dry Martini",
    "category": "Clássicos",
    "ingredients": [
      {
        "n": "Gin",
        "q": "60 ml (London Dry)"
      },
      {
        "n": "Vermute",
        "q": "10 ml (Seco)"
      },
      {
        "n": "Azeitona",
        "q": "1 ou 2 unid"
      },
      {
        "n": "Gelo",
        "q": "para mexer"
      }
    ],
    "steps": "1. Gele bem a taça martini previamente.\n2. Mexa gin e vermute seco em mixing glass com gelo grande por 30 segundos.\n3. Coe sem gelo para a taça e finalize com azeitona ou twist de limão.",
    "description": "Seco, cristalino e imponente: gin mexido com vermute seco.",
    "story": "Conhecido como “o rei dos coquetéis”, imortalizado nos grandes hotéis e no cinema pela pureza gelada servida em taça em V.",
    "glass": "Taça Martini",
    "technique": "Mexido (stirred)",
    "garnish": "Azeitona no palito ou twist de limão",
    "shaken": false,
    "tags": [
      "Clássico",
      "Forte",
      "Curto",
      "Gin"
    ]
  },
  {
    "name": "Manhattan",
    "category": "Clássicos",
    "ingredients": [
      {
        "n": "Whisky",
        "q": "60 ml (Rye ou Bourbon)"
      },
      {
        "n": "Vermute",
        "q": "25 ml (Tinto)"
      },
      {
        "n": "Angostura",
        "q": "2 dashes"
      },
      {
        "n": "Cereja",
        "q": "1 unid"
      },
      {
        "n": "Gelo",
        "q": "para mexer"
      }
    ],
    "steps": "1. Mexa whisky, vermute tinto e Angostura em mixing glass cheio de gelo por 25 segundos.\n2. Coe para taça coupe gelada.\n3. Decore com cereja.",
    "description": "Whisky, vermute tinto e Angostura mexidos e servidos sem gelo.",
    "story": "Nascido em Nova York na década de 1870 no Manhattan Club, foi o primeiro grande clássico a casar whisky com vermute doce.",
    "glass": "Taça Coupe",
    "technique": "Mexido",
    "garnish": "Cereja ao marasquino",
    "shaken": false,
    "tags": [
      "Clássico",
      "Forte",
      "Curto",
      "Whisky"
    ]
  },
  {
    "name": "Whiskey Sour",
    "category": "Clássicos",
    "ingredients": [
      {
        "n": "Whisky",
        "q": "60 ml (Bourbon)"
      },
      {
        "n": "Limão",
        "q": "25 ml (Siciliano)"
      },
      {
        "n": "Xarope de açúcar",
        "q": "20 ml"
      },
      {
        "n": "Clara de ovo",
        "q": "15 ml (opcional)"
      },
      {
        "n": "Angostura",
        "q": "2 gotas"
      },
      {
        "n": "Gelo",
        "q": "para bater"
      }
    ],
    "steps": "1. Se usar clara de ovo, bata primeiro sem gelo (dry shake) por 10 segundos.\n2. Adicione gelo, bata forte por 12 segundos e coe para copo baixo com gelo.\n3. Finalize com gotas de Angostura na espuma.",
    "description": "Bourbon, limão siciliano e açúcar batidos em espuma cremosa.",
    "story": "Documentado desde 1862 no primeiro livro de receitas de Jerry Thomas, é o pilar absoluto da família dos Sours no mundo.",
    "glass": "Copo baixo",
    "technique": "Dry shake + shaker",
    "garnish": "Cereja e gotas de Angostura",
    "shaken": true,
    "tags": [
      "Clássico",
      "Cítrico / Ácido",
      "Cremoso",
      "Whisky"
    ]
  },
  {
    "name": "Margarita",
    "category": "Clássicos",
    "ingredients": [
      {
        "n": "Tequila",
        "q": "50 ml (Prata)"
      },
      {
        "n": "Triple Sec",
        "q": "25 ml (ou Cointreau)"
      },
      {
        "n": "Limão",
        "q": "25 ml (Taiti)"
      },
      {
        "n": "Sal",
        "q": "na borda"
      },
      {
        "n": "Gelo",
        "q": "para bater"
      }
    ],
    "steps": "1. Passe limão em meia borda da taça e encoste no sal fino.\n2. Bata tequila, licor de laranja e limão com muito gelo por 12 segundos.\n3. Coe duas vezes na taça gelada.",
    "description": "Tequila prata, licor de laranja, limão fresco e meia borda de sal.",
    "story": "Ícone mexicano dos anos 1930-40 em que o sal na borda realça o agave da tequila e equilibra a acidez do limão.",
    "glass": "Taça Margarita / Coupe",
    "technique": "Shaker",
    "garnish": "Meia borda de sal e rodela de limão",
    "shaken": true,
    "tags": [
      "Clássico",
      "Cítrico / Ácido",
      "Tequila"
    ]
  },
  {
    "name": "Tommy's Margarita",
    "category": "Cítricos",
    "ingredients": [
      {
        "n": "Tequila",
        "q": "60 ml (Reposado ou Prata)"
      },
      {
        "n": "Limão",
        "q": "30 ml (Taiti)"
      },
      {
        "n": "Mel",
        "q": "15 ml (ou agave)"
      },
      {
        "n": "Sal",
        "q": "na borda"
      },
      {
        "n": "Gelo",
        "q": "para bater"
      }
    ],
    "steps": "1. Bata tequila, limão fresco e mel diluído (ou néctar de agave) com bastante gelo.\n2. Coe sobre gelo novo em copo baixo com meia borda de sal.",
    "description": "Versão moderna de São Francisco sem licor de laranja, destacando o agave puro.",
    "story": "Criada por Julio Bermejo no restaurante Tommy’s em São Francisco no fim dos anos 1980, tornou-se referência mundial entre bartenders.",
    "glass": "Copo baixo",
    "technique": "Shaker",
    "garnish": "Meia borda de sal e limão",
    "shaken": true,
    "tags": [
      "Clássico",
      "Cítrico / Ácido",
      "Tequila"
    ]
  },
  {
    "name": "Daiquiri",
    "category": "Clássicos",
    "ingredients": [
      {
        "n": "Rum",
        "q": "60 ml (Branco)"
      },
      {
        "n": "Limão",
        "q": "25 ml (Taiti)"
      },
      {
        "n": "Xarope de açúcar",
        "q": "20 ml"
      },
      {
        "n": "Gelo",
        "q": "para bater"
      }
    ],
    "steps": "1. Bata rum branco, suco de limão fresco e xarope de açúcar vigorosamente com bastante gelo.\n2. Coe duas vezes para taça coupe gelada.",
    "description": "Rum branco, limão fresco e açúcar em equilíbrio cristalino.",
    "story": "Batizado em homenagem à praia e mina de Daiquirí em Cuba por volta de 1898, era o favorito de Ernest Hemingway em Havana.",
    "glass": "Taça Coupe",
    "technique": "Shaker",
    "garnish": "Casca ou fatia fina de limão",
    "shaken": true,
    "tags": [
      "Clássico",
      "Cítrico / Ácido",
      "Curto",
      "Rum"
    ]
  },
  {
    "name": "Hemingway Daiquiri",
    "category": "Cítricos",
    "ingredients": [
      {
        "n": "Rum",
        "q": "60 ml (Branco)"
      },
      {
        "n": "Maraschino",
        "q": "15 ml"
      },
      {
        "n": "Suco de grapefruit",
        "q": "30 ml"
      },
      {
        "n": "Limão",
        "q": "20 ml (Taiti)"
      },
      {
        "n": "Gelo",
        "q": "para bater"
      }
    ],
    "steps": "1. Bata todos os ingredientes vigorosamente com muito gelo.\n2. Coe duas vezes para taça coupe gelada.",
    "description": "Daiquiri seco com licor Maraschino e frescor cítrico de grapefruit.",
    "story": "Criado no bar El Floridita em Havana para Ernest Hemingway, que preferia o drink sem açúcar refinado e com toque de toranja e cereja maraschino.",
    "glass": "Taça Coupe",
    "technique": "Shaker",
    "garnish": "Rodela de limão",
    "shaken": true,
    "tags": [
      "Clássico",
      "Cítrico / Ácido",
      "Forte",
      "Rum"
    ]
  },
  {
    "name": "Mojito",
    "category": "Clássicos",
    "ingredients": [
      {
        "n": "Rum",
        "q": "50 ml (Branco)"
      },
      {
        "n": "Hortelã",
        "q": "10 folhas"
      },
      {
        "n": "Limão",
        "q": "25 ml (Taiti)"
      },
      {
        "n": "Xarope de açúcar",
        "q": "20 ml"
      },
      {
        "n": "Água com gás",
        "q": "60 ml"
      },
      {
        "n": "Gelo",
        "q": "cubos ou picado"
      }
    ],
    "steps": "1. Pressione suavemente a hortelã com limão e xarope no fundo do copo alto sem triturar.\n2. Adicione rum e muito gelo.\n3. Complete com água com gás e mexa de baixo para cima.",
    "description": "Rum branco, hortelã fresca, limão, açúcar e água com gás.",
    "story": "Herdeiro cubano do século XVI (“El Draque”), consolidado nos bares de Havana como sinônimo de frescor caribenho.",
    "glass": "Copo alto",
    "technique": "Macerado suave + build",
    "garnish": "Buquê de hortelã e rodela de limão",
    "shaken": false,
    "tags": [
      "Clássico",
      "Refrescante",
      "Herbal / Hortelã",
      "Longo",
      "Rum"
    ]
  },
  {
    "name": "Moscow Mule",
    "category": "Clássicos",
    "ingredients": [
      {
        "n": "Vodka",
        "q": "50 ml"
      },
      {
        "n": "Limão",
        "q": "20 ml (Taiti)"
      },
      {
        "n": "Xarope de gengibre",
        "q": "25 ml"
      },
      {
        "n": "Água com gás",
        "q": "90 ml"
      },
      {
        "n": "Hortelã",
        "q": "4 folhas"
      },
      {
        "n": "Gelo",
        "q": "cubos"
      }
    ],
    "steps": "1. Encha a caneca de cobre ou copo alto com gelo.\n2. Despeje vodka, limão e xarope de gengibre.\n3. Complete com água com gás, mexa leve e decore com hortelã.",
    "description": "Vodka, gengibre picante e limão servidos geladíssimos na caneca.",
    "story": "Criado em 1941 em Los Angeles por John Martin e Jack Morgan para unir vodka Smirnoff, ginger beer e canecas de cobre numa jogada histórica de bar.",
    "glass": "Caneca de cobre",
    "technique": "Montado na caneca",
    "garnish": "Rodela de limão e ramo de hortelã",
    "shaken": false,
    "tags": [
      "Clássico",
      "Refrescante",
      "Picante / Gengibre",
      "Vodka"
    ]
  },
  {
    "name": "Dark 'n' Stormy",
    "category": "Clássicos",
    "ingredients": [
      {
        "n": "Rum",
        "q": "50 ml (Escuro ou Branco)"
      },
      {
        "n": "Xarope de gengibre",
        "q": "25 ml"
      },
      {
        "n": "Limão",
        "q": "15 ml (Taiti)"
      },
      {
        "n": "Água com gás",
        "q": "90 ml"
      },
      {
        "n": "Gelo",
        "q": "cubos"
      }
    ],
    "steps": "1. Encha o copo alto com gelo.\n2. Adicione xarope de gengibre, limão e água com gás.\n3. Finalize com o rum flutuando por cima para criar o visual de nuvem escura.",
    "description": "Rum aromático com gengibre intenso e limão sobre gelo.",
    "story": "Drink nacional das Bermudas criado após a Primeira Guerra Mundial por marinheiros britânicos fascinados pela cor de tempestade no mar.",
    "glass": "Copo alto",
    "technique": "Montado em camadas",
    "garnish": "Gomo de limão",
    "shaken": false,
    "tags": [
      "Clássico",
      "Picante / Gengibre",
      "Refrescante",
      "Longo",
      "Rum"
    ]
  },
  {
    "name": "Cosmopolitan",
    "category": "Clássicos",
    "ingredients": [
      {
        "n": "Vodka",
        "q": "45 ml"
      },
      {
        "n": "Triple Sec",
        "q": "15 ml"
      },
      {
        "n": "Suco de cranberry",
        "q": "30 ml"
      },
      {
        "n": "Limão",
        "q": "15 ml (Taiti)"
      },
      {
        "n": "Gelo",
        "q": "para bater"
      }
    ],
    "steps": "1. Bata vodka, Triple Sec, suco de cranberry e limão com muito gelo.\n2. Coe duas vezes para taça martini ou coupe gelada.\n3. Perfume com casca de laranja.",
    "description": "Elegante, rosado e cítrico: vodka, laranja, cranberry e limão.",
    "story": "Popularizado em Nova York nos anos 1990 por Dale DeGroff no Rainbow Room e consagrado na cultura pop mundial.",
    "glass": "Taça Martini / Coupe",
    "technique": "Shaker",
    "garnish": "Casca de laranja",
    "shaken": true,
    "tags": [
      "Clássico",
      "Cítrico / Ácido",
      "Frutado",
      "Vodka"
    ]
  },
  {
    "name": "Espresso Martini",
    "category": "Clássicos",
    "ingredients": [
      {
        "n": "Vodka",
        "q": "50 ml"
      },
      {
        "n": "Licor de café",
        "q": "25 ml"
      },
      {
        "n": "Café espresso",
        "q": "35 ml"
      },
      {
        "n": "Xarope de açúcar",
        "q": "10 ml"
      },
      {
        "n": "Café em grãos",
        "q": "3 grãos"
      },
      {
        "n": "Gelo",
        "q": "para bater"
      }
    ],
    "steps": "1. Extraia o café espresso e deixe esfriar brevemente.\n2. Bata todos os ingredientes com força máxima e bastante gelo por 15 segundos para formar crema espessa.\n3. Coe duas vezes e decore com 3 grãos.",
    "description": "Espresso fresco batido com vodka e licor de café com crema aveludada.",
    "story": "Criado em Londres em 1983 pelo lendário Dick Bradsell quando uma cliente pediu algo que a acordasse e a animasse ao mesmo tempo.",
    "glass": "Taça Coupe / Martini",
    "technique": "Shaker vigoroso",
    "garnish": "3 grãos de café",
    "shaken": true,
    "tags": [
      "Clássico",
      "Cremoso",
      "Forte",
      "Vodka"
    ]
  },
  {
    "name": "Pornstar Martini",
    "category": "Clássicos",
    "ingredients": [
      {
        "n": "Vodka",
        "q": "45 ml"
      },
      {
        "n": "Maracujá",
        "q": "1 fruta"
      },
      {
        "n": "Xarope de baunilha",
        "q": "20 ml"
      },
      {
        "n": "Limão",
        "q": "15 ml (Taiti)"
      },
      {
        "n": "Espumante",
        "q": "60 ml (shot à parte)"
      },
      {
        "n": "Gelo",
        "q": "para bater"
      }
    ],
    "steps": "1. Bata vodka, polpa de maracujá, xarope de baunilha e limão com gelo.\n2. Coe duas vezes na taça coupe e coloque meia casca de maracujá flutuando.\n3. Sirva acompanhado de um shot de espumante gelado.",
    "description": "Maracujá vibrante, baunilha sedosa e taça acompanhada de espumante.",
    "story": "Criado em Londres em 2002 por Douglas Ankrah no bar Townhouse, tornou-se um dos coquetéis mais pedidos dos bares contemporâneos europeus.",
    "glass": "Taça Coupe + Shot",
    "technique": "Shaker",
    "garnish": "Meia casca de maracujá",
    "shaken": true,
    "tags": [
      "Clássico",
      "Tropical",
      "Frutado",
      "Vodka"
    ]
  },
  {
    "name": "Cuba Libre",
    "category": "Clássicos",
    "ingredients": [
      {
        "n": "Rum",
        "q": "50 ml (Branco ou Dourado)"
      },
      {
        "n": "Coca-Cola",
        "q": "130 ml"
      },
      {
        "n": "Limão",
        "q": "15 ml (Taiti)"
      },
      {
        "n": "Gelo",
        "q": "cubos"
      }
    ],
    "steps": "1. Encha um copo alto com cubos de gelo.\n2. Esprema o limão fresco, adicione o rum e complete com Coca-Cola gelada.\n3. Mexa suavemente uma vez.",
    "description": "Rum, Coca-Cola gelada e o corte cítrico indispensável do limão.",
    "story": "Surgido em Havana por volta de 1900 como brinde à independência de Cuba — o limão fresco transforma o refrigerante em coquetel de verdade.",
    "glass": "Copo alto",
    "technique": "Montado (build)",
    "garnish": "Gomo de limão",
    "shaken": false,
    "tags": [
      "Clássico",
      "Refrescante",
      "Longo",
      "Rum"
    ]
  },
  {
    "name": "Gin Tônica",
    "category": "Clássicos",
    "ingredients": [
      {
        "n": "Gin",
        "q": "50 ml (London Dry)"
      },
      {
        "n": "Água tônica",
        "q": "130 ml"
      },
      {
        "n": "Limão",
        "q": "1 rodela (Siciliano)"
      },
      {
        "n": "Gelo",
        "q": "muitos cubos"
      }
    ],
    "steps": "1. Encha uma taça balão com bastante gelo firme.\n2. Despeje o gin, complete suavemente com água tônica gelada.\n3. Finalize com rodela ou casca de limão siciliano.",
    "description": "Clássico atemporal de gin botânico, tônica gelada e perfume cítrico.",
    "story": "Nascido no século XIX na Índia colonial quando oficiais britânicos suavizaram a água tônica rica em quinino com gin e limão.",
    "glass": "Taça balão",
    "technique": "Montado na taça",
    "garnish": "Rodela de limão siciliano",
    "shaken": false,
    "tags": [
      "Clássico",
      "Refrescante",
      "Com soda / Tônica",
      "Longo",
      "Gin"
    ]
  },
  {
    "name": "Tom Collins",
    "category": "Clássicos",
    "ingredients": [
      {
        "n": "Gin",
        "q": "50 ml"
      },
      {
        "n": "Limão",
        "q": "25 ml (Siciliano)"
      },
      {
        "n": "Xarope de açúcar",
        "q": "20 ml"
      },
      {
        "n": "Água com gás",
        "q": "90 ml"
      },
      {
        "n": "Gelo",
        "q": "cubos"
      }
    ],
    "steps": "1. Bata gin, suco de limão siciliano e xarope de açúcar com gelo (ou monte direto).\n2. Coe para copo alto com gelo novo e complete com água com gás.",
    "description": "Limonada elegante e gaseificada com base de gin.",
    "story": "Popularizado em 1874 por causa da “Grande Farsa de Tom Collins” em Nova York e eternizado por Jerry Thomas em seu guia de 1876.",
    "glass": "Copo alto (Collins)",
    "technique": "Shaker + build",
    "garnish": "Rodela de limão e cereja",
    "shaken": true,
    "tags": [
      "Clássico",
      "Refrescante",
      "Cítrico / Ácido",
      "Longo",
      "Gin"
    ]
  },
  {
    "name": "Gin Fizz",
    "category": "Clássicos",
    "ingredients": [
      {
        "n": "Gin",
        "q": "50 ml"
      },
      {
        "n": "Limão",
        "q": "25 ml (Siciliano)"
      },
      {
        "n": "Xarope de açúcar",
        "q": "20 ml"
      },
      {
        "n": "Água com gás",
        "q": "60 ml"
      },
      {
        "n": "Gelo",
        "q": "para bater"
      }
    ],
    "steps": "1. Bata gin, limão siciliano e xarope vigorosamente com gelo por 12 segundos.\n2. Coe para copo alto sem gelo (ou pouco gelo) e complete com água com gás para subir a espuma.",
    "description": "Aéreo, cítrico e efervescente em copo alto.",
    "story": "Estrela dos bares americanos desde o final do século XIX, famoso por ser servido bem gelado logo ao sair da coqueteleira.",
    "glass": "Copo alto",
    "technique": "Shaker + top de gás",
    "garnish": "Casca de limão siciliano",
    "shaken": true,
    "tags": [
      "Clássico",
      "Refrescante",
      "Cítrico / Ácido",
      "Gin"
    ]
  },
  {
    "name": "Ramos Gin Fizz",
    "category": "Clássicos",
    "ingredients": [
      {
        "n": "Gin",
        "q": "50 ml"
      },
      {
        "n": "Limão",
        "q": "20 ml (Siciliano)"
      },
      {
        "n": "Xarope de açúcar",
        "q": "20 ml"
      },
      {
        "n": "Creme de leite",
        "q": "30 ml"
      },
      {
        "n": "Clara de ovo",
        "q": "20 ml"
      },
      {
        "n": "Água de flor de laranjeira",
        "q": "3 gotas"
      },
      {
        "n": "Água com gás",
        "q": "40 ml"
      },
      {
        "n": "Gelo",
        "q": "para bater"
      }
    ],
    "steps": "1. Bata todos os ingredientes exceto a água com gás sem gelo (dry shake) por 20 segundos.\n2. Adicione gelo e bata vigorosamente até formar espuma densa.\n3. Coe para copo alto e complete devagar com água com gás para erguer o colarinho.",
    "description": "Nuvem cremosa de gin, creme de leite, cítricos e flor de laranjeira.",
    "story": "Criado por Henry C. Ramos em 1888 em Nova Orleans — tão trabalhoso de bater que os bares contratavam filas de bartenders para revezar na coqueteleira.",
    "glass": "Copo alto",
    "technique": "Dry shake longo + shaker",
    "garnish": "Colarinho alto de espuma",
    "shaken": true,
    "tags": [
      "Clássico",
      "Cremoso",
      "Cítrico / Ácido",
      "Gin"
    ]
  },
  {
    "name": "Gimlet",
    "category": "Clássicos",
    "ingredients": [
      {
        "n": "Gin",
        "q": "60 ml"
      },
      {
        "n": "Limão",
        "q": "25 ml (Taiti)"
      },
      {
        "n": "Xarope de açúcar",
        "q": "20 ml"
      },
      {
        "n": "Gelo",
        "q": "para bater"
      }
    ],
    "steps": "1. Bata gin, limão fresco e xarope de açúcar com muito gelo por 12 segundos.\n2. Coe duas vezes para taça coupe bem gelada.",
    "description": "Minimalista, ácido e sedoso: gin em evidência com corte de limão.",
    "story": "Batizado em homenagem ao médico naval britânico Sir Thomas Gimlette, que misturava suco de limão ao gin dos marinheiros contra o escorbuto.",
    "glass": "Taça Coupe",
    "technique": "Shaker",
    "garnish": "Rodela fina ou casca de limão",
    "shaken": true,
    "tags": [
      "Clássico",
      "Cítrico / Ácido",
      "Curto",
      "Gin"
    ]
  },
  {
    "name": "Southside",
    "category": "Refrescantes",
    "ingredients": [
      {
        "n": "Gin",
        "q": "60 ml"
      },
      {
        "n": "Hortelã",
        "q": "10 folhas"
      },
      {
        "n": "Limão",
        "q": "25 ml (Taiti)"
      },
      {
        "n": "Xarope de açúcar",
        "q": "20 ml"
      },
      {
        "n": "Gelo",
        "q": "para bater"
      }
    ],
    "steps": "1. Coloque gin, hortelã fresca, limão e xarope na coqueteleira com bastante gelo.\n2. Bata forte por 12 segundos.\n3. Coe duas vezes para taça coupe gelada.",
    "description": "O primo elegante do Mojito feito com gin e servido em taça coupe.",
    "story": "Lenda da Lei Seca americana ligado ao South Side de Chicago (ou ao Southside Sportsmen’s Club em Long Island), onde a hortelã suavizava os gins intensos da época.",
    "glass": "Taça Coupe",
    "technique": "Shaker + double strain",
    "garnish": "Folha de hortelã flutuando",
    "shaken": true,
    "tags": [
      "Clássico",
      "Refrescante",
      "Herbal / Hortelã",
      "Gin"
    ]
  },
  {
    "name": "Southside Fizz",
    "category": "Refrescantes",
    "ingredients": [
      {
        "n": "Gin",
        "q": "50 ml"
      },
      {
        "n": "Hortelã",
        "q": "10 folhas"
      },
      {
        "n": "Limão",
        "q": "25 ml (Taiti)"
      },
      {
        "n": "Xarope de açúcar",
        "q": "20 ml"
      },
      {
        "n": "Água com gás",
        "q": "70 ml"
      },
      {
        "n": "Gelo",
        "q": "cubos"
      }
    ],
    "steps": "1. Bata gin, hortelã, limão e xarope com gelo.\n2. Coe duas vezes para copo alto com gelo novo e complete com água com gás.",
    "description": "Versão longa e borbulhante do Southside, como um Mojito de gin.",
    "story": "Evolução de clubes de verão americanos que adicionou água com gás ao Southside para tardes quentes.",
    "glass": "Copo alto",
    "technique": "Shaker + build",
    "garnish": "Ramo de hortelã e rodela de limão",
    "shaken": true,
    "tags": [
      "Clássico",
      "Refrescante",
      "Herbal / Hortelã",
      "Longo",
      "Gin"
    ]
  },
  {
    "name": "Gin Basil Smash",
    "category": "Refrescantes",
    "ingredients": [
      {
        "n": "Gin",
        "q": "60 ml"
      },
      {
        "n": "Manjericão",
        "q": "12 folhas"
      },
      {
        "n": "Limão",
        "q": "25 ml (Siciliano)"
      },
      {
        "n": "Xarope de açúcar",
        "q": "20 ml"
      },
      {
        "n": "Gelo",
        "q": "para bater"
      }
    ],
    "steps": "1. Macere delicadamente o manjericão com o xarope no fundo da coqueteleira.\n2. Adicione gin, limão e gelo e bata forte.\n3. Coe duas vezes sobre gelo grande.",
    "description": "Verde vibrante e aromático de manjericão fresco com gin e siciliano.",
    "story": "Criado em 2008 por Jörg Meyer no bar Le Lion em Hamburgo, virou fenômeno imediato na coquetelaria moderna mundial.",
    "glass": "Copo baixo",
    "technique": "Macerado + shaker",
    "garnish": "Ramo de manjericão fresco",
    "shaken": true,
    "tags": [
      "Clássico",
      "Refrescante",
      "Herbal / Hortelã",
      "Gin"
    ]
  },
  {
    "name": "Clover Club",
    "category": "Clássicos",
    "ingredients": [
      {
        "n": "Gin",
        "q": "50 ml"
      },
      {
        "n": "Xarope de framboesa",
        "q": "20 ml"
      },
      {
        "n": "Limão",
        "q": "20 ml (Siciliano)"
      },
      {
        "n": "Clara de ovo",
        "q": "20 ml"
      },
      {
        "n": "Framboesa",
        "q": "2 unid"
      },
      {
        "n": "Gelo",
        "q": "para bater"
      }
    ],
    "steps": "1. Bata todos os ingredientes primeiro sem gelo (dry shake) por 10 segundos.\n2. Adicione bastante gelo, bata vigorosamente e coe duas vezes na taça coupe.",
    "description": "Rosa sedoso de gin, framboesa, limão siciliano e espuma de clara.",
    "story": "Batizado em homenagem ao clube de cavalheiros do Hotel Bellevue-Stratford na Filadélfia nos anos 1890, muito antes da Lei Seca.",
    "glass": "Taça Coupe",
    "technique": "Dry shake + shaker",
    "garnish": "3 framboesas no palito",
    "shaken": true,
    "tags": [
      "Clássico",
      "Cremoso",
      "Frutado",
      "Gin"
    ]
  },
  {
    "name": "Bramble",
    "category": "Clássicos",
    "ingredients": [
      {
        "n": "Gin",
        "q": "50 ml"
      },
      {
        "n": "Limão",
        "q": "25 ml (Siciliano)"
      },
      {
        "n": "Xarope de açúcar",
        "q": "15 ml"
      },
      {
        "n": "Licor de amora",
        "q": "15 ml"
      },
      {
        "n": "Amora",
        "q": "2 unid"
      },
      {
        "n": "Gelo",
        "q": "triturado"
      }
    ],
    "steps": "1. Bata gin, limão siciliano e xarope de açúcar com gelo.\n2. Coe para copo baixo lotado de gelo triturado.\n3. Despeje o licor de amora lentamente por cima para escorrer em efeito mármore.",
    "description": "Gin sour servido em gelo picado com cascata roxa de licor de amora.",
    "story": "Criado em Londres em 1984 por Dick Bradsell, inspirado nas memórias de infância colhendo amoras silvestres na Ilha de Wight.",
    "glass": "Copo baixo",
    "technique": "Shaker + drizzle",
    "garnish": "Amoras frescas e rodela de limão",
    "shaken": true,
    "tags": [
      "Clássico",
      "Frutado",
      "Cítrico / Ácido",
      "Gin"
    ]
  },
  {
    "name": "Fitzgerald",
    "category": "Cítricos",
    "ingredients": [
      {
        "n": "Gin",
        "q": "50 ml"
      },
      {
        "n": "Limão",
        "q": "25 ml (Siciliano)"
      },
      {
        "n": "Xarope de açúcar",
        "q": "20 ml"
      },
      {
        "n": "Angostura",
        "q": "2 dashes"
      },
      {
        "n": "Gelo",
        "q": "para bater"
      }
    ],
    "steps": "1. Bata gin, limão siciliano, xarope e Angostura com muito gelo.\n2. Coe duas vezes na taça coupe gelada.",
    "description": "Gin sour perfumado pela especiaria da Angostura.",
    "story": "Criado por Dale DeGroff no Rainbow Room em Nova York nos anos 1990 em tributo a F. Scott Fitzgerald, autor de O Grande Gatsby.",
    "glass": "Taça Coupe",
    "technique": "Shaker",
    "garnish": "Rodela de limão siciliano",
    "shaken": true,
    "tags": [
      "Clássico",
      "Cítrico / Ácido",
      "Curto",
      "Gin"
    ]
  },
  {
    "name": "Bee's Knees",
    "category": "Cítricos",
    "ingredients": [
      {
        "n": "Gin",
        "q": "60 ml"
      },
      {
        "n": "Mel",
        "q": "20 ml (diluído)"
      },
      {
        "n": "Limão",
        "q": "25 ml (Siciliano)"
      },
      {
        "n": "Gelo",
        "q": "para bater"
      }
    ],
    "steps": "1. Dissolva o mel em um fio de água morna ou bata bem com o suco de limão.\n2. Adicione gin e gelo, bata vigorosamente e coe duas vezes na coupe.",
    "description": "Mel floral, limão siciliano e gin botânico da era da Lei Seca.",
    "story": "Expressão dos anos 1920 equivalente a “o máximo!” — bartenders usavam mel e limão para domar destilados artesanais da época.",
    "glass": "Taça Coupe",
    "technique": "Shaker",
    "garnish": "Casca de limão siciliano",
    "shaken": true,
    "tags": [
      "Clássico",
      "Cítrico / Ácido",
      "Doce",
      "Gin"
    ]
  },
  {
    "name": "Aviation",
    "category": "Clássicos",
    "ingredients": [
      {
        "n": "Gin",
        "q": "50 ml"
      },
      {
        "n": "Maraschino",
        "q": "15 ml"
      },
      {
        "n": "Crème de Violette",
        "q": "7 ml"
      },
      {
        "n": "Limão",
        "q": "20 ml (Siciliano)"
      },
      {
        "n": "Cereja",
        "q": "1 unid"
      },
      {
        "n": "Gelo",
        "q": "para bater"
      }
    ],
    "steps": "1. Bata todos os ingredientes com bastante gelo.\n2. Coe duas vezes para taça coupe gelada e finalize com cereja no fundo.",
    "description": "Coquetel azul-lavanda pálido com notas florais de violeta e cereja maraschino.",
    "story": "Criado por Hugo Ensslin em 1916 no Hotel Wallick em Nova York, batizado pela cor de céu limpo no alvorecer da aviação.",
    "glass": "Taça Coupe",
    "technique": "Shaker",
    "garnish": "Cereja ao marasquino",
    "shaken": true,
    "tags": [
      "Clássico",
      "Cítrico / Ácido",
      "Curto",
      "Gin"
    ]
  },
  {
    "name": "Corpse Reviver No. 2",
    "category": "Clássicos",
    "ingredients": [
      {
        "n": "Gin",
        "q": "22 ml"
      },
      {
        "n": "Cointreau",
        "q": "22 ml"
      },
      {
        "n": "Lillet",
        "q": "22 ml (Blanc)"
      },
      {
        "n": "Limão",
        "q": "22 ml (Siciliano)"
      },
      {
        "n": "Absinto",
        "q": "1 borrifada"
      },
      {
        "n": "Gelo",
        "q": "para bater"
      }
    ],
    "steps": "1. Perfume o interior da taça coupe gelada com absinto e descarte o excesso.\n2. Bata gin, Cointreau, Lillet e limão com gelo.\n3. Coe duas vezes na taça.",
    "description": "Equilíbrio cítrico, floral e anisado que “ressuscita” qualquer noite.",
    "story": "Imortalizado por Harry Craddock no Savoy Cocktail Book em 1930 com o famoso aviso: “quatro destes seguidos irão desreviver o cadáver”.",
    "glass": "Taça Coupe",
    "technique": "Shaker + rinse de absinto",
    "garnish": "Casca de laranja ou cereja",
    "shaken": true,
    "tags": [
      "Clássico",
      "Cítrico / Ácido",
      "Curto",
      "Gin"
    ]
  },
  {
    "name": "Last Word",
    "category": "Fortes",
    "ingredients": [
      {
        "n": "Gin",
        "q": "25 ml"
      },
      {
        "n": "Chartreuse",
        "q": "25 ml (Verde)"
      },
      {
        "n": "Maraschino",
        "q": "25 ml"
      },
      {
        "n": "Limão",
        "q": "25 ml (Taiti)"
      },
      {
        "n": "Gelo",
        "q": "para bater"
      }
    ],
    "steps": "1. Bata os quatro ingredientes em partes iguais com muito gelo.\n2. Coe duas vezes para taça coupe gelada.",
    "description": "Quatro partes iguais explosivas: gin, Chartreuse verde, Maraschino e limão.",
    "story": "Nascido no Detroit Athletic Club antes da Lei Seca e redescoberto em 2004 em Seattle, virou obsessão absoluta da coquetelaria moderna.",
    "glass": "Taça Coupe",
    "technique": "Shaker",
    "garnish": "Cereja ou casca de limão",
    "shaken": true,
    "tags": [
      "Clássico",
      "Forte",
      "Herbal / Hortelã",
      "Gin"
    ]
  },
  {
    "name": "Paper Plane",
    "category": "Clássicos",
    "ingredients": [
      {
        "n": "Whisky",
        "q": "25 ml (Bourbon)"
      },
      {
        "n": "Aperol",
        "q": "25 ml"
      },
      {
        "n": "Amaro",
        "q": "25 ml (Nonino)"
      },
      {
        "n": "Limão",
        "q": "25 ml (Siciliano)"
      },
      {
        "n": "Gelo",
        "q": "para bater"
      }
    ],
    "steps": "1. Bata bourbon, Aperol, Amaro e limão siciliano em partes iguais com gelo.\n2. Coe duas vezes para taça coupe gelada.",
    "description": "O clássico moderno perfeito: bourbon, Aperol, amaro italiano e siciliano.",
    "story": "Criado por Sam Ross em 2008 para o Violet Hour em Chicago ao som da música “Paper Planes” da M.I.A., usando a fórmula simétrica do Last Word.",
    "glass": "Taça Coupe",
    "technique": "Shaker",
    "garnish": "Mini avião de papel na borda",
    "shaken": true,
    "tags": [
      "Clássico",
      "Amargo",
      "Cítrico / Ácido",
      "Whisky"
    ]
  },
  {
    "name": "Penicillin",
    "category": "Clássicos",
    "ingredients": [
      {
        "n": "Whisky",
        "q": "60 ml (Scotch)"
      },
      {
        "n": "Xarope de mel",
        "q": "15 ml"
      },
      {
        "n": "Xarope de gengibre",
        "q": "15 ml"
      },
      {
        "n": "Limão",
        "q": "25 ml (Siciliano)"
      },
      {
        "n": "Gengibre",
        "q": "1 fatia"
      },
      {
        "n": "Gelo",
        "q": "para bater"
      }
    ],
    "steps": "1. Bata Scotch whisky, xarope de mel, xarope de gengibre e limão siciliano com gelo.\n2. Coe sobre gelo grande no copo baixo.\n3. Se tiver whisky turfado, flutue 5 ml por cima.",
    "description": "Scotch whisky, mel, gengibre picante e limão siciliano em copo baixo.",
    "story": "Criado por Sam Ross em 2005 no Milk & Honey de Nova York, é considerado o clássico moderno mais influente do século XXI.",
    "glass": "Copo baixo",
    "technique": "Shaker",
    "garnish": "Fatia de gengibre",
    "shaken": true,
    "tags": [
      "Clássico",
      "Picante / Gengibre",
      "Forte",
      "Whisky"
    ]
  },
  {
    "name": "Gold Rush",
    "category": "Fortes",
    "ingredients": [
      {
        "n": "Whisky",
        "q": "60 ml (Bourbon)"
      },
      {
        "n": "Mel",
        "q": "20 ml (diluído)"
      },
      {
        "n": "Limão",
        "q": "25 ml (Siciliano)"
      },
      {
        "n": "Gelo",
        "q": "para bater"
      }
    ],
    "steps": "1. Bata bourbon, xarope de mel e limão siciliano com gelo.\n2. Coe sobre pedra grande de gelo em copo baixo.",
    "description": "Versão de bourbon do Bee’s Knees: mel aveludado e acidez limpa.",
    "story": "Criado por T.J. Siegal no Milk & Honey em Nova York no início dos anos 2000, abrindo caminho direto para a criação do Penicillin.",
    "glass": "Copo baixo",
    "technique": "Shaker",
    "garnish": "Casca de limão siciliano",
    "shaken": true,
    "tags": [
      "Clássico",
      "Forte",
      "Cítrico / Ácido",
      "Whisky"
    ]
  },
  {
    "name": "Brown Derby",
    "category": "Cítricos",
    "ingredients": [
      {
        "n": "Whisky",
        "q": "50 ml (Bourbon)"
      },
      {
        "n": "Suco de grapefruit",
        "q": "30 ml"
      },
      {
        "n": "Mel",
        "q": "15 ml"
      },
      {
        "n": "Gelo",
        "q": "para bater"
      }
    ],
    "steps": "1. Bata bourbon, suco de grapefruit fresco e xarope de mel com muito gelo.\n2. Coe para taça coupe gelada.",
    "description": "Bourbon com amargor frutado de grapefruit e toque de mel.",
    "story": "Criado em Hollywood nos anos 1930 para o restaurante Brown Derby, famoso pelo salão em formato de chapéu-coco.",
    "glass": "Taça Coupe",
    "technique": "Shaker",
    "garnish": "Casca de grapefruit",
    "shaken": true,
    "tags": [
      "Clássico",
      "Cítrico / Ácido",
      "Whisky"
    ]
  },
  {
    "name": "Boulevardier",
    "category": "Fortes",
    "ingredients": [
      {
        "n": "Whisky",
        "q": "30 ml (Bourbon)"
      },
      {
        "n": "Campari",
        "q": "30 ml"
      },
      {
        "n": "Vermute",
        "q": "30 ml (Tinto)"
      },
      {
        "n": "Laranja",
        "q": "1 casca"
      },
      {
        "n": "Gelo",
        "q": "1 cubo grande"
      }
    ],
    "steps": "1. Mexa bourbon, Campari e vermute tinto em mixing glass com gelo.\n2. Coe sobre gelo grande no copo baixo.\n3. Perfume com casca de laranja.",
    "description": "O irmão parisiense do Negroni com calor amadeirado de bourbon.",
    "story": "Criado em 1927 no Harry’s New York Bar em Paris para o escritor americano Erskine Gwynne, fundador da revista Boulevardier.",
    "glass": "Old fashioned",
    "technique": "Mexido (stirred)",
    "garnish": "Casca de laranja",
    "shaken": false,
    "tags": [
      "Clássico",
      "Amargo",
      "Forte",
      "Curto",
      "Whisky"
    ]
  },
  {
    "name": "Sazerac",
    "category": "Fortes",
    "ingredients": [
      {
        "n": "Whisky",
        "q": "45 ml (Rye)"
      },
      {
        "n": "Conhaque",
        "q": "15 ml"
      },
      {
        "n": "Absinto",
        "q": "1 borrifada"
      },
      {
        "n": "Bitter Peychaud",
        "q": "4 dashes"
      },
      {
        "n": "Açúcar",
        "q": "1 torrão"
      },
      {
        "n": "Limão",
        "q": "1 casca (Siciliano)"
      },
      {
        "n": "Gelo",
        "q": "para mexer"
      }
    ],
    "steps": "1. Gele um copo baixo, borrife absinto e gire para perfumar.\n2. Em mixing glass, macere açúcar com Peychaud, adicione whisky, conhaque e gelo e mexa por 25s.\n3. Coe sem gelo para o copo perfumado e torça a casca de limão siciliano.",
    "description": "Drink oficial de Nova Orleans: whisky, conhaque, Peychaud e halo de absinto.",
    "story": "Nascido em Nova Orleans na década de 1850, considerado por muitos historiadores o primeiro coquetel americano de marca registrada.",
    "glass": "Old fashioned (sem gelo)",
    "technique": "Mexido + rinse de absinto",
    "garnish": "Casca de limão siciliano torcida",
    "shaken": false,
    "tags": [
      "Clássico",
      "Forte",
      "Curto",
      "Whisky",
      "Conhaque"
    ]
  },
  {
    "name": "Vieux Carré",
    "category": "Fortes",
    "ingredients": [
      {
        "n": "Whisky",
        "q": "30 ml (Rye)"
      },
      {
        "n": "Conhaque",
        "q": "30 ml"
      },
      {
        "n": "Vermute",
        "q": "30 ml (Tinto)"
      },
      {
        "n": "Bénédictine",
        "q": "10 ml"
      },
      {
        "n": "Angostura",
        "q": "2 dashes"
      },
      {
        "n": "Bitter Peychaud",
        "q": "2 dashes"
      },
      {
        "n": "Gelo",
        "q": "1 cubo grande"
      }
    ],
    "steps": "1. Mexa todos os ingredientes em mixing glass com gelo por 25 segundos.\n2. Coe sobre gelo grande em copo baixo.",
    "description": "Complexidade de Nova Orleans unindo centeio, conhaque, vermute, Bénédictine e bitters.",
    "story": "Criado por Walter Bergeron em 1938 no Carousel Bar do Hotel Monteleone, batizado em homenagem ao bairro francês de Nova Orleans.",
    "glass": "Old fashioned",
    "technique": "Mexido",
    "garnish": "Cereja ou casca de limão",
    "shaken": false,
    "tags": [
      "Clássico",
      "Forte",
      "Curto",
      "Whisky",
      "Conhaque"
    ]
  },
  {
    "name": "Sidecar",
    "category": "Clássicos",
    "ingredients": [
      {
        "n": "Conhaque",
        "q": "50 ml"
      },
      {
        "n": "Cointreau",
        "q": "25 ml"
      },
      {
        "n": "Limão",
        "q": "20 ml (Siciliano)"
      },
      {
        "n": "Açúcar",
        "q": "na borda"
      },
      {
        "n": "Gelo",
        "q": "para bater"
      }
    ],
    "steps": "1. Faça meia borda de açúcar na taça coupe.\n2. Bata conhaque, Cointreau e limão siciliano com gelo.\n3. Coe duas vezes na taça gelada.",
    "description": "Conhaque francês, licor de laranja e limão siciliano com crosta de açúcar.",
    "story": "Surgido em Paris ou Londres logo após a Primeira Guerra Mundial, batizado em homenagem ao sidecar da motocicleta de um capitão frequentador do bar.",
    "glass": "Taça Coupe",
    "technique": "Shaker",
    "garnish": "Meia borda de açúcar e casca de laranja",
    "shaken": true,
    "tags": [
      "Clássico",
      "Cítrico / Ácido",
      "Conhaque"
    ]
  },
  {
    "name": "Between the Sheets",
    "category": "Fortes",
    "ingredients": [
      {
        "n": "Rum",
        "q": "30 ml (Branco)"
      },
      {
        "n": "Conhaque",
        "q": "30 ml"
      },
      {
        "n": "Triple Sec",
        "q": "30 ml"
      },
      {
        "n": "Limão",
        "q": "20 ml (Siciliano)"
      },
      {
        "n": "Gelo",
        "q": "para bater"
      }
    ],
    "steps": "1. Bata rum branco, conhaque, Triple Sec e limão com bastante gelo.\n2. Coe duas vezes para taça coupe gelada.",
    "description": "Variação provocante do Sidecar com rum branco dividindo o palco com o conhaque.",
    "story": "Criado por Harry MacElhone nos anos 1930 no Harry’s New York Bar em Paris como um clássico noturno de altíssimo astral.",
    "glass": "Taça Coupe",
    "technique": "Shaker",
    "garnish": "Casca de limão siciliano",
    "shaken": true,
    "tags": [
      "Clássico",
      "Forte",
      "Cítrico / Ácido",
      "Rum",
      "Conhaque"
    ]
  },
  {
    "name": "Brandy Alexander",
    "category": "Doces & Frutados",
    "ingredients": [
      {
        "n": "Conhaque",
        "q": "40 ml"
      },
      {
        "n": "Licor de cacau",
        "q": "25 ml"
      },
      {
        "n": "Creme de leite",
        "q": "30 ml"
      },
      {
        "n": "Noz-moscada",
        "q": "1 pitada"
      },
      {
        "n": "Gelo",
        "q": "para bater"
      }
    ],
    "steps": "1. Bata conhaque, licor de cacau e creme de leite com muito gelo por 15 segundos.\n2. Coe para taça coupe gelada e rale noz-moscada fresca por cima.",
    "description": "Sobremesa líquida clássica de conhaque, cacau e creme de leite com noz-moscada.",
    "story": "Evolução de um drink de gin criado nos anos 1910 em Nova York; na versão com conhaque, conquistou os salões do século XX.",
    "glass": "Taça Coupe",
    "technique": "Shaker",
    "garnish": "Noz-moscada ralada",
    "shaken": true,
    "tags": [
      "Clássico",
      "Cremoso",
      "Doce",
      "Conhaque"
    ]
  },
  {
    "name": "Vesper Martini",
    "category": "Fortes",
    "ingredients": [
      {
        "n": "Gin",
        "q": "45 ml"
      },
      {
        "n": "Vodka",
        "q": "15 ml"
      },
      {
        "n": "Lillet",
        "q": "10 ml (Blanc)"
      },
      {
        "n": "Limão",
        "q": "1 casca (Siciliano)"
      },
      {
        "n": "Gelo",
        "q": "para bater"
      }
    ],
    "steps": "1. Bata gin, vodka e Lillet Blanc com muito gelo até ficar quase congelado.\n2. Coe para taça coupe gelada e perfume com casca larga de limão siciliano.",
    "description": "Gin, vodka e Lillet Blanc geladíssimos, batidos e finalizados com siciliano.",
    "story": "Escrito por Ian Fleming em 1953 em Casino Royale, batizado por James Bond em homenagem a Vesper Lynd.",
    "glass": "Taça Martini / Coupe",
    "technique": "Shaker",
    "garnish": "Casca de limão siciliano",
    "shaken": true,
    "tags": [
      "Clássico",
      "Forte",
      "Curto",
      "Gin",
      "Vodka"
    ]
  },
  {
    "name": "Hanky Panky",
    "category": "Fortes",
    "ingredients": [
      {
        "n": "Gin",
        "q": "45 ml"
      },
      {
        "n": "Vermute",
        "q": "45 ml (Tinto)"
      },
      {
        "n": "Fernet",
        "q": "7 ml"
      },
      {
        "n": "Laranja",
        "q": "1 casca"
      },
      {
        "n": "Gelo",
        "q": "para mexer"
      }
    ],
    "steps": "1. Mexa gin, vermute tinto e Fernet em mixing glass com gelo.\n2. Coe para taça coupe gelada e expresse os óleos da casca de laranja.",
    "description": "Gin e vermute doce aprofundados por um toque medicinal e mentolado de Fernet.",
    "story": "Criado por Ada Coleman no American Bar do Hotel Savoy em Londres nos anos 1900 para o ator Sir Charles Hawtrey.",
    "glass": "Taça Coupe",
    "technique": "Mexido",
    "garnish": "Casca de laranja",
    "shaken": false,
    "tags": [
      "Clássico",
      "Amargo",
      "Forte",
      "Gin"
    ]
  },
  {
    "name": "Martinez",
    "category": "Fortes",
    "ingredients": [
      {
        "n": "Gin",
        "q": "45 ml"
      },
      {
        "n": "Vermute",
        "q": "45 ml (Tinto)"
      },
      {
        "n": "Maraschino",
        "q": "7 ml"
      },
      {
        "n": "Bitter de laranja",
        "q": "2 dashes"
      },
      {
        "n": "Laranja",
        "q": "1 casca"
      },
      {
        "n": "Gelo",
        "q": "para mexer"
      }
    ],
    "steps": "1. Mexa todos os ingredientes em mixing glass com gelo por 25 segundos.\n2. Coe para taça coupe gelada e perfume com laranja.",
    "description": "O elo perdido entre o Manhattan e o Dry Martini, rico e aromático.",
    "story": "Publicado na década de 1880 na Califórnia, é celebrado como o ancestral direto do Dry Martini.",
    "glass": "Taça Coupe",
    "technique": "Mexido",
    "garnish": "Casca de laranja ou cereja",
    "shaken": false,
    "tags": [
      "Clássico",
      "Forte",
      "Curto",
      "Gin"
    ]
  },
  {
    "name": "White Lady",
    "category": "Cítricos",
    "ingredients": [
      {
        "n": "Gin",
        "q": "45 ml"
      },
      {
        "n": "Triple Sec",
        "q": "25 ml"
      },
      {
        "n": "Limão",
        "q": "20 ml (Siciliano)"
      },
      {
        "n": "Clara de ovo",
        "q": "15 ml"
      },
      {
        "n": "Gelo",
        "q": "para bater"
      }
    ],
    "steps": "1. Bata sem gelo (dry shake) por 10 segundos.\n2. Adicione gelo, bata vigorosamente e coe duas vezes para taça coupe.",
    "description": "Espuma branca acetinada unindo gin, laranja e limão siciliano.",
    "story": "Consagrado por Harry Craddock em 1930 no Hotel Savoy em Londres, o equivalente ao Sidecar feito com gin.",
    "glass": "Taça Coupe",
    "technique": "Dry shake + shaker",
    "garnish": "Casca de limão siciliano",
    "shaken": true,
    "tags": [
      "Clássico",
      "Cítrico / Ácido",
      "Cremoso",
      "Gin"
    ]
  },
  {
    "name": "Pink Lady",
    "category": "Doces & Frutados",
    "ingredients": [
      {
        "n": "Gin",
        "q": "45 ml"
      },
      {
        "n": "Calvados",
        "q": "15 ml"
      },
      {
        "n": "Grenadine",
        "q": "10 ml"
      },
      {
        "n": "Limão",
        "q": "20 ml (Siciliano)"
      },
      {
        "n": "Clara de ovo",
        "q": "15 ml"
      },
      {
        "n": "Gelo",
        "q": "para bater"
      }
    ],
    "steps": "1. Faça dry shake sem gelo por 10 segundos.\n2. Bata com gelo e coe duas vezes na coupe gelada.",
    "description": "Elegante drink rosado da década de 1910 com gin, maçã e grenadine.",
    "story": "Batizado em homenagem ao musical da Broadway “The Pink Lady” de 1911 — um clássico refinado injustamente subestimado.",
    "glass": "Taça Coupe",
    "technique": "Dry shake + shaker",
    "garnish": "Cereja",
    "shaken": true,
    "tags": [
      "Clássico",
      "Cremoso",
      "Frutado",
      "Gin"
    ]
  },
  {
    "name": "White Russian",
    "category": "Doces & Frutados",
    "ingredients": [
      {
        "n": "Vodka",
        "q": "50 ml"
      },
      {
        "n": "Licor de café",
        "q": "25 ml"
      },
      {
        "n": "Creme de leite",
        "q": "30 ml"
      },
      {
        "n": "Gelo",
        "q": "cubos"
      }
    ],
    "steps": "1. Monte vodka e licor de café no copo baixo com gelo.\n2. Despeje o creme de leite levemente batido por cima para criar efeito mármore.",
    "description": "Café intenso com vodka e camada sedosa de creme de leite.",
    "story": "Imortalizado por Jeff Bridges em O Grande Lebowski (1998), nasceu nos anos 1960 como variação cremosa do Black Russian.",
    "glass": "Old fashioned",
    "technique": "Montado no copo",
    "garnish": "Opcional: raspas de chocolate",
    "shaken": false,
    "tags": [
      "Clássico",
      "Cremoso",
      "Doce",
      "Vodka"
    ]
  },
  {
    "name": "Black Russian",
    "category": "Fortes",
    "ingredients": [
      {
        "n": "Vodka",
        "q": "50 ml"
      },
      {
        "n": "Licor de café",
        "q": "25 ml"
      },
      {
        "n": "Gelo",
        "q": "1 cubo grande"
      }
    ],
    "steps": "1. Coloque vodka e licor de café em copo baixo com gelo.\n2. Mexa por 15 segundos para gelar e integrar.",
    "description": "Direto, escuro e elegante: apenas vodka e licor de café sobre gelo.",
    "story": "Criado em 1949 em Bruxelas por Gustave Tops no Hotel Metropole em homenagem à embaixadora americana Perle Mesta.",
    "glass": "Old fashioned",
    "technique": "Mexido no copo",
    "garnish": "Sem guarnição",
    "shaken": false,
    "tags": [
      "Clássico",
      "Forte",
      "Curto",
      "Vodka"
    ]
  },
  {
    "name": "Amaretto Sour",
    "category": "Doces & Frutados",
    "ingredients": [
      {
        "n": "Licor de amêndoa (Amaretto)",
        "q": "45 ml"
      },
      {
        "n": "Whisky",
        "q": "20 ml (Bourbon)"
      },
      {
        "n": "Limão",
        "q": "30 ml (Siciliano)"
      },
      {
        "n": "Xarope de açúcar",
        "q": "10 ml"
      },
      {
        "n": "Clara de ovo",
        "q": "15 ml"
      },
      {
        "n": "Angostura",
        "q": "2 dashes"
      },
      {
        "n": "Gelo",
        "q": "para bater"
      }
    ],
    "steps": "1. Faça dry shake com todos os ingredientes exceto gelo.\n2. Bata com gelo e coe sobre cubo grande em copo baixo.\n3. Finalize com gotas de Angostura na espuma.",
    "description": "Amêndoa doce equilibrada com bourbon encorpado e espuma cítrica.",
    "story": "Elevado ao patamar de alta coquetelaria por Jeffrey Morgenthaler em 2012 ao incluir bourbon para dar estrutura ao licor de amêndoas.",
    "glass": "Copo baixo",
    "technique": "Dry shake + shaker",
    "garnish": "Cereja e casca de laranja",
    "shaken": true,
    "tags": [
      "Clássico",
      "Doce",
      "Cremoso",
      "Cítrico / Ácido"
    ]
  },
  {
    "name": "Mint Julep",
    "category": "Fortes",
    "ingredients": [
      {
        "n": "Whisky",
        "q": "60 ml (Bourbon)"
      },
      {
        "n": "Hortelã",
        "q": "12 folhas"
      },
      {
        "n": "Xarope de açúcar",
        "q": "15 ml"
      },
      {
        "n": "Gelo",
        "q": "triturado"
      }
    ],
    "steps": "1. Pressione suavemente a hortelã com o xarope no copo ou caneca.\n2. Encha com gelo triturado, despeje o bourbon e mexa até o copo suar por fora.\n3. Complete o domo de gelo triturado e espete um buquê de hortelã.",
    "description": "Bourbon geladíssimo em montanha de gelo triturado e hortelã aromática.",
    "story": "Drink oficial do Kentucky Derby desde 1938, símbolo da hospitalidade sulista americana desde o século XVIII.",
    "glass": "Copo Julep / Baixo",
    "technique": "Montado + swizzle",
    "garnish": "Buquê generoso de hortelã",
    "shaken": false,
    "tags": [
      "Clássico",
      "Forte",
      "Herbal / Hortelã",
      "Whisky"
    ]
  },
  {
    "name": "New York Sour",
    "category": "Clássicos",
    "ingredients": [
      {
        "n": "Whisky",
        "q": "60 ml (Bourbon ou Rye)"
      },
      {
        "n": "Limão",
        "q": "25 ml (Siciliano)"
      },
      {
        "n": "Xarope de açúcar",
        "q": "20 ml"
      },
      {
        "n": "Clara de ovo",
        "q": "15 ml"
      },
      {
        "n": "Vinho tinto",
        "q": "15 ml (seco)"
      },
      {
        "n": "Gelo",
        "q": "para bater"
      }
    ],
    "steps": "1. Bata whisky, limão, xarope e clara (dry shake + gelo).\n2. Coe sobre gelo novo no copo baixo.\n3. Com uma colher bailarina, flutue o vinho tinto lentamente sobre a espuma.",
    "description": "Whiskey sour visualmente marcante coroado por uma camada de vinho tinto.",
    "story": "Surgiu em Chicago na década de 1880 com nomes variados antes de se firmar como New York Sour nos bares de Manhattan.",
    "glass": "Copo baixo",
    "technique": "Shaker + float de vinho",
    "garnish": "Casca de limão e camada rubi de vinho",
    "shaken": true,
    "tags": [
      "Clássico",
      "Cítrico / Ácido",
      "Cremoso",
      "Whisky"
    ]
  },
  {
    "name": "Horse's Neck",
    "category": "Refrescantes",
    "ingredients": [
      {
        "n": "Conhaque",
        "q": "50 ml"
      },
      {
        "n": "Xarope de gengibre",
        "q": "25 ml"
      },
      {
        "n": "Água com gás",
        "q": "110 ml"
      },
      {
        "n": "Limão",
        "q": "1 espiral inteira (Siciliano)"
      },
      {
        "n": "Gelo",
        "q": "cubos"
      }
    ],
    "steps": "1. Descasque o limão siciliano em uma espiral contínua e acomode dentro do copo alto.\n2. Encha com gelo, adicione conhaque e xarope de gengibre.\n3. Complete com água com gás.",
    "description": "Conhaque, gengibre e espiral longa de limão siciliano em copo alto.",
    "story": "Nasceu como bebida sem álcool nos anos 1890 e ganhou conhaque na virada do século XX, batizado pela casca que lembra um pescoço de cavalo.",
    "glass": "Copo alto",
    "technique": "Montado no copo",
    "garnish": "Espiral longa de limão siciliano",
    "shaken": false,
    "tags": [
      "Clássico",
      "Picante / Gengibre",
      "Refrescante",
      "Conhaque"
    ]
  },
  {
    "name": "Brandy Sour",
    "category": "Cítricos",
    "ingredients": [
      {
        "n": "Conhaque",
        "q": "60 ml"
      },
      {
        "n": "Limão",
        "q": "25 ml (Siciliano)"
      },
      {
        "n": "Xarope de açúcar",
        "q": "20 ml"
      },
      {
        "n": "Gelo",
        "q": "para bater"
      }
    ],
    "steps": "1. Bata conhaque, suco de limão siciliano e xarope de açúcar com muito gelo.\n2. Coe sobre gelo novo ou em taça coupe.",
    "description": "Conhaque aveludado domado por limão siciliano fresco e xarope simples.",
    "story": "Clássico oitocentista anterior até ao Sidecar, muito apreciado no Mediterrâneo e em clubes britânicos.",
    "glass": "Copo baixo",
    "technique": "Shaker",
    "garnish": "Rodela de limão siciliano",
    "shaken": true,
    "tags": [
      "Clássico",
      "Cítrico / Ácido",
      "Conhaque"
    ]
  },
  {
    "name": "Brandy Daisy",
    "category": "Cítricos",
    "ingredients": [
      {
        "n": "Conhaque",
        "q": "50 ml"
      },
      {
        "n": "Limão",
        "q": "25 ml (Siciliano)"
      },
      {
        "n": "Xarope de groselha",
        "q": "15 ml"
      },
      {
        "n": "Água com gás",
        "q": "45 ml"
      },
      {
        "n": "Gelo",
        "q": "para bater"
      }
    ],
    "steps": "1. Bata conhaque, limão siciliano e groselha com gelo.\n2. Coe sobre gelo em taça ou copo baixo e finalize com splash de água com gás.",
    "description": "Clássico da família Daisy com conhaque, limão, groselha e gás leve.",
    "story": "Documentado por Jerry Thomas nos anos 1870, faz parte da linhagem histórica das “Daisies” que deu origem à própria Margarita.",
    "glass": "Copo baixo",
    "technique": "Shaker + splash",
    "garnish": "Morango ou casca de limão",
    "shaken": true,
    "tags": [
      "Clássico",
      "Cítrico / Ácido",
      "Frutado",
      "Conhaque"
    ]
  },
  {
    "name": "Gin Daisy",
    "category": "Cítricos",
    "ingredients": [
      {
        "n": "Gin",
        "q": "50 ml"
      },
      {
        "n": "Limão",
        "q": "25 ml (Siciliano)"
      },
      {
        "n": "Xarope de groselha",
        "q": "15 ml"
      },
      {
        "n": "Água com gás",
        "q": "50 ml"
      },
      {
        "n": "Gelo",
        "q": "para bater"
      }
    ],
    "steps": "1. Bata gin, limão siciliano e xarope de groselha com bastante gelo.\n2. Coe sobre gelo triturado e complete com splash de água com gás.",
    "description": "Gin cítrico e rosado da família oitocentista das Daisies.",
    "story": "Antes da fama do Negroni, a Gin Daisy reinava nos bares americanos como uma combinação refrescante, rubi e gaseificada.",
    "glass": "Taça ou copo baixo",
    "technique": "Shaker + splash",
    "garnish": "Rodela de limão e hortelã",
    "shaken": true,
    "tags": [
      "Clássico",
      "Cítrico / Ácido",
      "Frutado",
      "Gin"
    ]
  },
  {
    "name": "Gin Rickey",
    "category": "Refrescantes",
    "ingredients": [
      {
        "n": "Gin",
        "q": "50 ml"
      },
      {
        "n": "Limão",
        "q": "25 ml (Taiti)"
      },
      {
        "n": "Água com gás",
        "q": "120 ml"
      },
      {
        "n": "Gelo",
        "q": "cubos"
      }
    ],
    "steps": "1. Encha o copo alto com gelo.\n2. Esprema o limão fresco e jogue a casca no copo.\n3. Adicione gin e complete com água com gás sem açúcar.",
    "description": "Zero açúcar: apenas gin, limão taiti fresco e muita água com gás.",
    "story": "Criado no Shoemaker’s Bar em Washington D.C. nos anos 1880 para o coronel Joe Rickey, perfeito para quem prefere drinks secos.",
    "glass": "Copo alto",
    "technique": "Montado no copo",
    "garnish": "Meio limão taiti",
    "shaken": false,
    "tags": [
      "Clássico",
      "Refrescante",
      "Cítrico / Ácido",
      "Com soda / Tônica",
      "Gin"
    ]
  },
  {
    "name": "Metropolitan",
    "category": "Fortes",
    "ingredients": [
      {
        "n": "Conhaque",
        "q": "50 ml"
      },
      {
        "n": "Vermute",
        "q": "25 ml (Tinto)"
      },
      {
        "n": "Xarope de açúcar",
        "q": "5 ml"
      },
      {
        "n": "Gelo",
        "q": "para mexer"
      }
    ],
    "steps": "1. Mexa conhaque, vermute tinto e um fio de xarope em mixing glass com gelo por 25s.\n2. Coe para taça coupe gelada.",
    "description": "O primo elegante e macio do Manhattan feito com conhaque.",
    "story": "Clássico da virada do século XX em Nova York quando o conhaque francês rivalizava com o rye whiskey nos salões de hotel.",
    "glass": "Taça Coupe",
    "technique": "Mexido",
    "garnish": "Cereja ou casca de laranja",
    "shaken": false,
    "tags": [
      "Clássico",
      "Forte",
      "Curto",
      "Conhaque"
    ]
  },
  {
    "name": "Harvard",
    "category": "Aperitivos",
    "ingredients": [
      {
        "n": "Conhaque",
        "q": "45 ml"
      },
      {
        "n": "Vermute",
        "q": "45 ml (Tinto)"
      },
      {
        "n": "Água com gás",
        "q": "45 ml"
      },
      {
        "n": "Limão",
        "q": "1 casca (Siciliano)"
      },
      {
        "n": "Gelo",
        "q": "cubos"
      }
    ],
    "steps": "1. Mexa conhaque e vermute tinto com gelo em mixing glass.\n2. Coe para taça ou copo baixo e finalize com água com gás.",
    "description": "Aperitivo clássico de conhaque e vermute tinto alongado com gás.",
    "story": "Receita registrada no início do século XX em livros clássicos americanos como opção leve de fim de tarde.",
    "glass": "Taça Coupe / Copo baixo",
    "technique": "Mexido + splash",
    "garnish": "Casca de limão siciliano",
    "shaken": false,
    "tags": [
      "Clássico",
      "Refrescante",
      "Conhaque",
      "Vermute & Aperitivos"
    ]
  },
  {
    "name": "Rusty Nail",
    "category": "Fortes",
    "ingredients": [
      {
        "n": "Whisky",
        "q": "45 ml (Scotch)"
      },
      {
        "n": "Drambuie",
        "q": "25 ml"
      },
      {
        "n": "Limão",
        "q": "1 casca (Siciliano)"
      },
      {
        "n": "Gelo",
        "q": "1 cubo grande"
      }
    ],
    "steps": "1. Despeje Scotch e Drambuie sobre gelo grande em copo baixo.\n2. Mexa suavemente por 20 segundos e perfume com casca de limão.",
    "description": "Scotch whisky e licor escocês Drambuie com notas de mel e urze.",
    "story": "Consagrado nos anos 1960 pelo Rat Pack em Nova York, nasceu ainda antes como o “prego enferrujado” dos bares escoceses.",
    "glass": "Old fashioned",
    "technique": "Mexido no copo",
    "garnish": "Casca de limão siciliano",
    "shaken": false,
    "tags": [
      "Clássico",
      "Forte",
      "Curto",
      "Whisky"
    ]
  },
  {
    "name": "Godfather",
    "category": "Fortes",
    "ingredients": [
      {
        "n": "Whisky",
        "q": "50 ml (Scotch ou Bourbon)"
      },
      {
        "n": "Licor de amêndoa (Amaretto)",
        "q": "25 ml"
      },
      {
        "n": "Gelo",
        "q": "1 cubo grande"
      }
    ],
    "steps": "1. Coloque whisky e Amaretto sobre uma pedra grande de gelo.\n2. Mexa devagar por 20 segundos.",
    "description": "Whisky robusto amaciado pelo perfume adocicado de amêndoas do Amaretto.",
    "story": "Popularizado nos anos 1970 na esteira do sucesso do filme O Poderoso Chefão, virou um digestivo clássico de fim de noite.",
    "glass": "Old fashioned",
    "technique": "Mexido no copo",
    "garnish": "Casca de laranja opcional",
    "shaken": false,
    "tags": [
      "Clássico",
      "Forte",
      "Curto",
      "Whisky"
    ]
  },
  {
    "name": "French Connection",
    "category": "Fortes",
    "ingredients": [
      {
        "n": "Conhaque",
        "q": "35 ml"
      },
      {
        "n": "Licor de amêndoa (Amaretto)",
        "q": "35 ml"
      },
      {
        "n": "Gelo",
        "q": "1 cubo grande"
      }
    ],
    "steps": "1. Despeje partes iguais de conhaque e Amaretto no copo baixo com gelo grande.\n2. Mexa suavemente para resfriar.",
    "description": "Partes iguais de conhaque francês e Amaretto italiano sobre gelo.",
    "story": "Batizado em homenagem ao premiado thriller Operação França (1971), faz parte da lista oficial da IBA.",
    "glass": "Old fashioned",
    "technique": "Mexido no copo",
    "garnish": "Sem guarnição",
    "shaken": false,
    "tags": [
      "Clássico",
      "Forte",
      "Doce",
      "Conhaque"
    ]
  },
  {
    "name": "Long Island Iced Tea",
    "category": "Fortes",
    "ingredients": [
      {
        "n": "Vodka",
        "q": "15 ml"
      },
      {
        "n": "Gin",
        "q": "15 ml"
      },
      {
        "n": "Rum",
        "q": "15 ml (Branco)"
      },
      {
        "n": "Tequila",
        "q": "15 ml"
      },
      {
        "n": "Triple Sec",
        "q": "15 ml"
      },
      {
        "n": "Limão",
        "q": "25 ml (Taiti)"
      },
      {
        "n": "Xarope de açúcar",
        "q": "20 ml"
      },
      {
        "n": "Coca-Cola",
        "q": "40 ml"
      },
      {
        "n": "Gelo",
        "q": "cubos"
      }
    ],
    "steps": "1. Coloque todos os destilados, Triple Sec, limão e xarope em copo alto com gelo.\n2. Mexa bem e complete apenas com um toque de Coca-Cola para dar cor âmbar de chá.",
    "description": "Cinco destilados equilibrados com limão e toque de cola em copo alto.",
    "story": "Criado nos anos 1970 em Long Island, Nova York, por Robert “Rosebud” Butt em um concurso de criação de drinks com Triple Sec.",
    "glass": "Copo alto",
    "technique": "Montado + mexido",
    "garnish": "Gomo de limão",
    "shaken": false,
    "tags": [
      "Clássico",
      "Forte",
      "Longo"
    ]
  },
  {
    "name": "Aperol Spritz",
    "category": "Aperitivos",
    "ingredients": [
      {
        "n": "Aperol",
        "q": "60 ml"
      },
      {
        "n": "Prosecco",
        "q": "90 ml"
      },
      {
        "n": "Água com gás",
        "q": "30 ml"
      },
      {
        "n": "Laranja",
        "q": "1 rodela"
      },
      {
        "n": "Gelo",
        "q": "cubos"
      }
    ],
    "steps": "1. Encha uma taça de vinho grande com bastante gelo.\n2. Despeje Prosecco, depois Aperol e finalize com splash de água com gás.\n3. Decore com rodela de laranja.",
    "description": "O aperitivo italiano alaranjado de ervas cítricas com Prosecco.",
    "story": "Nascido no Vêneto e popularizado em Pádua e Veneza nos anos 1950, virou o brinde oficial do fim de tarde europeu.",
    "glass": "Taça de vinho",
    "technique": "Montado na taça",
    "garnish": "Rodela de laranja",
    "shaken": false,
    "tags": [
      "Clássico",
      "Amargo",
      "Refrescante",
      "Com soda / Tônica",
      "Vermute & Aperitivos"
    ]
  },
  {
    "name": "Negroni Sbagliato",
    "category": "Aperitivos",
    "ingredients": [
      {
        "n": "Campari",
        "q": "30 ml"
      },
      {
        "n": "Vermute",
        "q": "30 ml (Tinto)"
      },
      {
        "n": "Espumante",
        "q": "30 ml (Brut ou Prosecco)"
      },
      {
        "n": "Laranja",
        "q": "1 rodela"
      },
      {
        "n": "Gelo",
        "q": "cubos"
      }
    ],
    "steps": "1. Despeje Campari e vermute tinto em copo baixo ou taça com gelo.\n2. Complete suavemente com espumante brut e decore com laranja.",
    "description": "O “Negroni errado” onde o espumante substitui o gin com leveza e gás.",
    "story": "Criado por acidente em 1972 por Mirko Stocchetto no Bar Basso em Milão ao pegar uma garrafa de espumante em vez de gin.",
    "glass": "Old fashioned / Taça",
    "technique": "Montado no copo",
    "garnish": "Meia rodela de laranja",
    "shaken": false,
    "tags": [
      "Clássico",
      "Amargo",
      "Refrescante",
      "Vermute & Aperitivos"
    ]
  },
  {
    "name": "Americano",
    "category": "Aperitivos",
    "ingredients": [
      {
        "n": "Campari",
        "q": "30 ml"
      },
      {
        "n": "Vermute",
        "q": "30 ml (Tinto)"
      },
      {
        "n": "Água com gás",
        "q": "60 ml"
      },
      {
        "n": "Laranja",
        "q": "1 rodela"
      },
      {
        "n": "Gelo",
        "q": "cubos"
      }
    ],
    "steps": "1. Coloque gelo em copo alto ou baixo.\n2. Adicione Campari e vermute tinto e complete com água com gás bem gelada.",
    "description": "Leve, amargo e borbulhante: o pai histórico do próprio Negroni.",
    "story": "Servido desde a década de 1860 no Caffè Campari em Milão e batizado pelo sucesso entre turistas americanos durante a Lei Seca.",
    "glass": "Copo alto / Old fashioned",
    "technique": "Montado no copo",
    "garnish": "Meia rodela de laranja",
    "shaken": false,
    "tags": [
      "Clássico",
      "Amargo",
      "Refrescante",
      "Com soda / Tônica",
      "Vermute & Aperitivos"
    ]
  },
  {
    "name": "Milano-Torino",
    "category": "Aperitivos",
    "ingredients": [
      {
        "n": "Campari",
        "q": "45 ml"
      },
      {
        "n": "Vermute",
        "q": "45 ml (Tinto)"
      },
      {
        "n": "Laranja",
        "q": "1 casca"
      },
      {
        "n": "Gelo",
        "q": "1 cubo grande"
      }
    ],
    "steps": "1. Mexa Campari e vermute tinto sobre gelo grande no copo baixo.\n2. Perfume com casca de laranja.",
    "description": "O encontro puro de Milão (Campari) e Turim (vermute tinto) sem gás.",
    "story": "Batizado pelas duas cidades italianas de origem de seus ingredientes em meados do século XIX.",
    "glass": "Old fashioned",
    "technique": "Mexido no copo",
    "garnish": "Casca de laranja",
    "shaken": false,
    "tags": [
      "Clássico",
      "Amargo",
      "Curto",
      "Vermute & Aperitivos"
    ]
  },
  {
    "name": "Garibaldi",
    "category": "Aperitivos",
    "ingredients": [
      {
        "n": "Campari",
        "q": "45 ml"
      },
      {
        "n": "Suco de laranja",
        "q": "120 ml (aerado)"
      },
      {
        "n": "Laranja",
        "q": "1 rodela"
      },
      {
        "n": "Gelo",
        "q": "cubos"
      }
    ],
    "steps": "1. Bata o suco de laranja na coqueteleira ou liquidificador rápido para ficar aerado e espumoso (“fluffy”).\n2. Despeje sobre Campari e gelo em copo alto.",
    "description": "Campari vibrante com suco de laranja aerado e cremoso no topo.",
    "story": "Homenagem ao herói da unificação italiana Giuseppe Garibaldi, consagrado pela versão “fluffy orange” do bar Dante em Nova York.",
    "glass": "Copo alto",
    "technique": "Montado com suco aerado",
    "garnish": "Gomo de laranja",
    "shaken": false,
    "tags": [
      "Clássico",
      "Amargo",
      "Cítrico / Ácido",
      "Vermute & Aperitivos"
    ]
  },
  {
    "name": "Campari Tonic",
    "category": "Aperitivos",
    "ingredients": [
      {
        "n": "Campari",
        "q": "50 ml"
      },
      {
        "n": "Água tônica",
        "q": "120 ml"
      },
      {
        "n": "Laranja",
        "q": "1 rodela"
      },
      {
        "n": "Gelo",
        "q": "cubos"
      }
    ],
    "steps": "1. Encha a taça ou copo alto com gelo.\n2. Despeje o Campari e complete com água tônica gelada.",
    "description": "Amargor herbáceo do Campari alongado pela efervescência da tônica.",
    "story": "Um dos highballs mais pedidos em bares italianos e rooftops paulistanos pela simplicidade elegante.",
    "glass": "Taça balão",
    "technique": "Montado na taça",
    "garnish": "Rodela de laranja ou limão",
    "shaken": false,
    "tags": [
      "Clássico",
      "Amargo",
      "Refrescante",
      "Com soda / Tônica",
      "Vermute & Aperitivos"
    ]
  },
  {
    "name": "Cynar Julep",
    "category": "Aperitivos",
    "ingredients": [
      {
        "n": "Cynar",
        "q": "50 ml"
      },
      {
        "n": "Hortelã",
        "q": "10 folhas"
      },
      {
        "n": "Limão",
        "q": "20 ml (Taiti)"
      },
      {
        "n": "Suco de grapefruit",
        "q": "45 ml"
      },
      {
        "n": "Xarope de açúcar",
        "q": "15 ml"
      },
      {
        "n": "Gelo",
        "q": "triturado"
      }
    ],
    "steps": "1. Pressione suavemente a hortelã no copo com xarope e limão.\n2. Adicione Cynar, grapefruit e muito gelo triturado, mexendo até gelar.",
    "description": "Aperitivo italiano de alcachofra refrescado com hortelã e grapefruit.",
    "story": "Hit dos bares argentinos e paulistanos modernos que provou como o Cynar brilha com cítricos frescos.",
    "glass": "Copo baixo / Julep",
    "technique": "Macerado + swizzle",
    "garnish": "Ramo de hortelã",
    "shaken": false,
    "tags": [
      "Amargo",
      "Refrescante",
      "Herbal / Hortelã",
      "Vermute & Aperitivos"
    ]
  },
  {
    "name": "Cynar Tonic",
    "category": "Aperitivos",
    "ingredients": [
      {
        "n": "Cynar",
        "q": "50 ml"
      },
      {
        "n": "Água tônica",
        "q": "120 ml"
      },
      {
        "n": "Limão",
        "q": "1 rodela"
      },
      {
        "n": "Gelo",
        "q": "cubos"
      }
    ],
    "steps": "1. Coloque bastante gelo em copo alto ou taça.\n2. Adicione Cynar, complete com água tônica e finalize com limão espremido.",
    "description": "Amargo herbal complexo de alcachofra com quinino da tônica.",
    "story": "Aperitivo italiano criado em 1952 que ganhou nova juventude nos balcões de coquetelaria ao lado da água tônica.",
    "glass": "Copo alto",
    "technique": "Montado no copo",
    "garnish": "Rodela de limão",
    "shaken": false,
    "tags": [
      "Amargo",
      "Refrescante",
      "Com soda / Tônica",
      "Vermute & Aperitivos"
    ]
  },
  {
    "name": "Hugo Spritz",
    "category": "Aperitivos",
    "ingredients": [
      {
        "n": "Espumante",
        "q": "90 ml (Prosecco ou Brut)"
      },
      {
        "n": "Licor de flor de sabugueiro",
        "q": "30 ml"
      },
      {
        "n": "Hortelã",
        "q": "8 folhas"
      },
      {
        "n": "Água com gás",
        "q": "30 ml"
      },
      {
        "n": "Limão",
        "q": "1 rodela"
      },
      {
        "n": "Gelo",
        "q": "cubos"
      }
    ],
    "steps": "1. Encha uma taça de vinho com gelo e folhas de hortelã.\n2. Adicione licor de flor de sabugueiro, espumante e água com gás.",
    "description": "Spritz alpino floral de sabugueiro, hortelã fresca e Prosecco.",
    "story": "Criado em 2005 pelo bartender Roland Gruber no Tirol do Sul (Itália) como alternativa floral e refrescante ao Aperol Spritz.",
    "glass": "Taça de vinho",
    "technique": "Montado na taça",
    "garnish": "Hortelã e rodela de limão",
    "shaken": false,
    "tags": [
      "Clássico",
      "Refrescante",
      "Herbal / Hortelã",
      "Com soda / Tônica"
    ]
  },
  {
    "name": "St-Germain Spritz",
    "category": "Aperitivos",
    "ingredients": [
      {
        "n": "Licor de flor de sabugueiro",
        "q": "40 ml"
      },
      {
        "n": "Espumante",
        "q": "60 ml (Brut)"
      },
      {
        "n": "Água com gás",
        "q": "60 ml"
      },
      {
        "n": "Limão",
        "q": "1 casca (Siciliano)"
      },
      {
        "n": "Gelo",
        "q": "cubos"
      }
    ],
    "steps": "1. Encha um copo alto ou taça com gelo.\n2. Despeje o licor de flor de sabugueiro, espumante e água com gás.\n3. Perfume com casca de limão siciliano.",
    "description": "Floral, leve e perfumado: licor francês de sabugueiro com bolhas.",
    "story": "Spritz assinatura da maison francesa St-Germain, famoso pela leveza aromática em almoços e terraços ao sol.",
    "glass": "Taça de vinho",
    "technique": "Montado na taça",
    "garnish": "Casca de limão siciliano",
    "shaken": false,
    "tags": [
      "Refrescante",
      "Doce",
      "Com soda / Tônica"
    ]
  },
  {
    "name": "French 75",
    "category": "Aperitivos",
    "ingredients": [
      {
        "n": "Gin",
        "q": "35 ml"
      },
      {
        "n": "Limão",
        "q": "15 ml (Siciliano)"
      },
      {
        "n": "Xarope de açúcar",
        "q": "15 ml"
      },
      {
        "n": "Espumante",
        "q": "90 ml (Brut)"
      },
      {
        "n": "Gelo",
        "q": "para bater"
      }
    ],
    "steps": "1. Bata gin, limão siciliano e xarope com gelo.\n2. Coe para taça flûte gelada e complete com espumante brut.",
    "description": "Gin cítrico batido e coroado com espumante seco em taça flûte.",
    "story": "Batizado em Paris durante a Primeira Guerra Mundial em referência ao rápido canhão francês de 75mm pelo efeito festivo.",
    "glass": "Taça Flûte",
    "technique": "Shaker + top de espumante",
    "garnish": "Espiral de limão siciliano",
    "shaken": true,
    "tags": [
      "Clássico",
      "Cítrico / Ácido",
      "Refrescante",
      "Gin"
    ]
  },
  {
    "name": "Kir Royale",
    "category": "Aperitivos",
    "ingredients": [
      {
        "n": "Champagne",
        "q": "100 ml (ou Espumante Brut)"
      },
      {
        "n": "Licor de cassis",
        "q": "15 ml"
      }
    ],
    "steps": "1. Coloque o licor de cassis no fundo da taça flûte gelada.\n2. Complete delicadamente com Champagne ou espumante brut.",
    "description": "Brinde francês rubi de Champagne seco com licor de cassis da Borgonha.",
    "story": "Versão nobre do aperitivo criado pelo cônego Félix Kir em Dijon após a Segunda Guerra Mundial, trocando o vinho branco por Champagne.",
    "glass": "Taça Flûte",
    "technique": "Montado na taça",
    "garnish": "Amora ou casca de limão",
    "shaken": false,
    "tags": [
      "Clássico",
      "Frutado",
      "Doce"
    ]
  },
  {
    "name": "Bellini",
    "category": "Aperitivos",
    "ingredients": [
      {
        "n": "Prosecco",
        "q": "100 ml"
      },
      {
        "n": "Suco de pêssego",
        "q": "50 ml (ou purê)"
      },
      {
        "n": "Pêssego",
        "q": "1 fatia"
      }
    ],
    "steps": "1. Coloque o purê ou suco gelado de pêssego na taça flûte.\n2. Complete lentamente com Prosecco e mexa uma vez.",
    "description": "Prosecco italiano aveludado com néctar suave de pêssego.",
    "story": "Criado por Giuseppe Cipriani em 1948 no Harry’s Bar de Veneza, batizado pela cor rosada das pinturas do mestre renascentista Giovanni Bellini.",
    "glass": "Taça Flûte",
    "technique": "Montado na taça",
    "garnish": "Fatia fina de pêssego",
    "shaken": false,
    "tags": [
      "Clássico",
      "Frutado",
      "Doce"
    ]
  },
  {
    "name": "Rossini",
    "category": "Aperitivos",
    "ingredients": [
      {
        "n": "Prosecco",
        "q": "100 ml"
      },
      {
        "n": "Morango",
        "q": "3 unid (em purê)"
      },
      {
        "n": "Xarope de açúcar",
        "q": "5 ml"
      }
    ],
    "steps": "1. Amasse bem os morangos com o fio de xarope até virar purê liso e coe para a taça flûte.\n2. Complete com Prosecco bem gelado.",
    "description": "Prosecco vibrante com purê fresco de morango.",
    "story": "Irmão italiano do Bellini, batizado em homenagem ao célebre compositor Gioachino Rossini.",
    "glass": "Taça Flûte",
    "technique": "Montado na taça",
    "garnish": "Morango na borda",
    "shaken": false,
    "tags": [
      "Clássico",
      "Frutado",
      "Refrescante"
    ]
  },
  {
    "name": "Mimosa",
    "category": "Aperitivos",
    "ingredients": [
      {
        "n": "Espumante",
        "q": "75 ml (Brut)"
      },
      {
        "n": "Suco de laranja",
        "q": "75 ml (fresco e coado)"
      }
    ],
    "steps": "1. Coloque o suco de laranja bem gelado na taça flûte.\n2. Complete em partes iguais com espumante brut gelado.",
    "description": "Partes iguais de espumante brut e suco fresco de laranja.",
    "story": "Consagrado nos anos 1920 no Hotel Ritz de Paris como o brinde perfeito de brunchs e manhãs ensolaradas.",
    "glass": "Taça Flûte",
    "technique": "Montado na taça",
    "garnish": "Twist fino de laranja",
    "shaken": false,
    "tags": [
      "Clássico",
      "Cítrico / Ácido",
      "Refrescante"
    ]
  },
  {
    "name": "Old Cuban",
    "category": "Aperitivos",
    "ingredients": [
      {
        "n": "Rum",
        "q": "45 ml (Envelhecido)"
      },
      {
        "n": "Hortelã",
        "q": "8 folhas"
      },
      {
        "n": "Limão",
        "q": "20 ml (Taiti)"
      },
      {
        "n": "Xarope de açúcar",
        "q": "20 ml"
      },
      {
        "n": "Angostura",
        "q": "2 dashes"
      },
      {
        "n": "Espumante",
        "q": "60 ml (Brut)"
      },
      {
        "n": "Gelo",
        "q": "para bater"
      }
    ],
    "steps": "1. Bata rum envelhecido, hortelã, limão, xarope e Angostura com gelo.\n2. Coe duas vezes para taça coupe gelada e complete com espumante brut.",
    "description": "Encontro luxuoso entre Mojito e French 75 com rum envelhecido e espumante.",
    "story": "Criado em 2001 por Audrey Saunders no Pegu Club de Nova York — um dos grandes ícones modernos dos bares nova-iorquinos.",
    "glass": "Taça Coupe",
    "technique": "Shaker + top de espumante",
    "garnish": "Folha de hortelã",
    "shaken": true,
    "tags": [
      "Clássico",
      "Herbal / Hortelã",
      "Refrescante",
      "Rum"
    ]
  },
  {
    "name": "White Negroni",
    "category": "Aperitivos",
    "ingredients": [
      {
        "n": "Gin",
        "q": "30 ml"
      },
      {
        "n": "Lillet",
        "q": "30 ml (Blanc)"
      },
      {
        "n": "Suze",
        "q": "30 ml"
      },
      {
        "n": "Limão",
        "q": "1 casca (Siciliano)"
      },
      {
        "n": "Gelo",
        "q": "1 cubo grande"
      }
    ],
    "steps": "1. Mexa gin, Lillet Blanc e Suze com gelo em mixing glass por 25 segundos.\n2. Coe sobre pedra grande de gelo e perfume com casca de limão siciliano.",
    "description": "Variação clara e floral do Negroni com genciana francesa (Suze) e Lillet.",
    "story": "Criado em 2001 em Bordeaux por Wayne Collins para a feira Vinexpo, usando ingredientes franceses no lugar dos italianos.",
    "glass": "Old fashioned",
    "technique": "Mexido",
    "garnish": "Casca de limão siciliano",
    "shaken": false,
    "tags": [
      "Clássico",
      "Amargo",
      "Curto",
      "Gin"
    ]
  },
  {
    "name": "Porto Tonico",
    "category": "Aperitivos",
    "ingredients": [
      {
        "n": "Vinho do Porto",
        "q": "60 ml (Branco)"
      },
      {
        "n": "Água tônica",
        "q": "110 ml"
      },
      {
        "n": "Limão",
        "q": "1 casca (Siciliano)"
      },
      {
        "n": "Hortelã",
        "q": "1 ramo"
      },
      {
        "n": "Gelo",
        "q": "cubos"
      }
    ],
    "steps": "1. Encha uma taça balão com gelo.\n2. Adicione Vinho do Porto Branco e complete com água tônica.\n3. Finalize com hortelã e casca de limão.",
    "description": "Aperitivo português levíssimo de Porto Branco com tônica e hortelã.",
    "story": "Cartão-postal das margens do rio Douro em Portugal, perfeito para quem quer frescor aromático e baixo teor alcoólico.",
    "glass": "Taça balão",
    "technique": "Montado na taça",
    "garnish": "Ramo de hortelã e limão",
    "shaken": false,
    "tags": [
      "Clássico",
      "Refrescante",
      "Com soda / Tônica",
      "Vermute & Aperitivos"
    ]
  },
  {
    "name": "Tinto de Verano",
    "category": "Aperitivos",
    "ingredients": [
      {
        "n": "Vinho tinto",
        "q": "100 ml"
      },
      {
        "n": "Refrigerante de limão",
        "q": "100 ml"
      },
      {
        "n": "Laranja",
        "q": "1 rodela"
      },
      {
        "n": "Limão",
        "q": "1 rodela"
      },
      {
        "n": "Gelo",
        "q": "cubos"
      }
    ],
    "steps": "1. Encha um copo alto ou taça de vinho com muito gelo e frutas cítricas.\n2. Despeje partes iguais de vinho tinto gelado e refrigerante de limão.",
    "description": "Clássico popular espanhol de verão com vinho tinto e soda cítrica.",
    "story": "Nascido em Córdoba na Espanha no início do século XX, disputando até com a Sangria a preferência nas tardes quentes.",
    "glass": "Taça de vinho / Copo alto",
    "technique": "Montado na taça",
    "garnish": "Rodela de limão e laranja",
    "shaken": false,
    "tags": [
      "Clássico",
      "Refrescante",
      "Longo",
      "Vermute & Aperitivos"
    ]
  },
  {
    "name": "Bamboo",
    "category": "Aperitivos",
    "ingredients": [
      {
        "n": "Xerez",
        "q": "45 ml (Seco)"
      },
      {
        "n": "Vermute",
        "q": "45 ml (Seco)"
      },
      {
        "n": "Bitter de laranja",
        "q": "2 dashes"
      },
      {
        "n": "Limão",
        "q": "1 casca (Siciliano)"
      },
      {
        "n": "Gelo",
        "q": "para mexer"
      }
    ],
    "steps": "1. Mexa xerez seco, vermute seco e bitter de laranja com muito gelo.\n2. Coe para taça coupe gelada e expresse casca de limão siciliano.",
    "description": "Aperitivo histórico de baixo teor alcoólico, seco, mineral e elegante.",
    "story": "Criado por volta de 1890 pelo bartender alemão Louis Eppinger no Grand Hotel de Yokohama, no Japão.",
    "glass": "Taça Coupe",
    "technique": "Mexido",
    "garnish": "Casca de limão siciliano",
    "shaken": false,
    "tags": [
      "Clássico",
      "Curto",
      "Vermute & Aperitivos"
    ]
  },
  {
    "name": "Tinto Tonic",
    "category": "Aperitivos",
    "ingredients": [
      {
        "n": "Vermute",
        "q": "50 ml (Tinto)"
      },
      {
        "n": "Água tônica",
        "q": "100 ml"
      },
      {
        "n": "Laranja",
        "q": "1 fatia"
      },
      {
        "n": "Limão",
        "q": "10 ml (Siciliano)"
      },
      {
        "n": "Gelo",
        "q": "cubos"
      }
    ],
    "steps": "1. Encha uma taça de vinho com bastante gelo.\n2. Despeje vermute tinto e limão siciliano e complete com água tônica.\n3. Finalize com fatia de laranja.",
    "description": "Vermute tinto aromático alongado com tônica e cítricos frescos.",
    "story": "Aperitivo descomplicado de boteco europeu adotado nos bares brasileiros por sua leveza e especiarias suaves.",
    "glass": "Taça de vinho",
    "technique": "Montado na taça",
    "garnish": "Fatia de laranja",
    "shaken": false,
    "tags": [
      "Refrescante",
      "Com soda / Tônica",
      "Vermute & Aperitivos"
    ]
  },
  {
    "name": "Sweet Martini",
    "category": "Fortes",
    "ingredients": [
      {
        "n": "Gin",
        "q": "50 ml"
      },
      {
        "n": "Vermute",
        "q": "25 ml (Tinto)"
      },
      {
        "n": "Cereja",
        "q": "1 unid"
      },
      {
        "n": "Gelo",
        "q": "para mexer"
      }
    ],
    "steps": "1. Mexa gin e vermute tinto em mixing glass com bastante gelo por 25 segundos.\n2. Coe para taça martini gelada e decore com cereja.",
    "description": "A versão doce e rubi do Martini antes do predomínio do Dry.",
    "story": "Muito popular antes dos anos 1920, mostra como o gin botânico casa com a riqueza herbácea do vermute tinto.",
    "glass": "Taça Martini",
    "technique": "Mexido",
    "garnish": "Cereja no palito",
    "shaken": false,
    "tags": [
      "Clássico",
      "Forte",
      "Curto",
      "Gin"
    ]
  },
  {
    "name": "Gin & It",
    "category": "Aperitivos",
    "ingredients": [
      {
        "n": "Gin",
        "q": "45 ml"
      },
      {
        "n": "Vermute",
        "q": "45 ml (Tinto)"
      },
      {
        "n": "Laranja",
        "q": "1 casca"
      },
      {
        "n": "Gelo",
        "q": "cubos"
      }
    ],
    "steps": "1. Mexa partes iguais de gin e vermute tinto italiano em copo baixo com gelo.\n2. Perfume com casca de laranja.",
    "description": "Clássico britânico de pub: gin e vermute italiano servidos em partes iguais.",
    "story": "Abreviação inglesa para “Gin and Italian Vermouth”, onipresente nos pubs londrinos desde o século XIX.",
    "glass": "Copo baixo",
    "technique": "Mexido no copo",
    "garnish": "Casca de laranja",
    "shaken": false,
    "tags": [
      "Clássico",
      "Curto",
      "Gin",
      "Vermute & Aperitivos"
    ]
  },
  {
    "name": "Cardinale",
    "category": "Aperitivos",
    "ingredients": [
      {
        "n": "Gin",
        "q": "40 ml"
      },
      {
        "n": "Campari",
        "q": "20 ml"
      },
      {
        "n": "Vermute",
        "q": "20 ml (Seco)"
      },
      {
        "n": "Limão",
        "q": "1 casca (Siciliano)"
      },
      {
        "n": "Gelo",
        "q": "para mexer"
      }
    ],
    "steps": "1. Mexa gin, Campari e vermute seco com gelo por 25 segundos.\n2. Coe para taça ou copo baixo com gelo novo.",
    "description": "Variação mais seca e luminosa do Negroni usando vermute seco.",
    "story": "Criado em Roma em 1950 no Hotel Excelsior em homenagem a um cardeal frequentador do bar — daí sua cor púrpura-escarlate.",
    "glass": "Old fashioned",
    "technique": "Mexido",
    "garnish": "Casca de limão siciliano",
    "shaken": false,
    "tags": [
      "Clássico",
      "Amargo",
      "Forte",
      "Gin"
    ]
  },
  {
    "name": "Bloody Mary",
    "category": "Aperitivos",
    "ingredients": [
      {
        "n": "Vodka",
        "q": "50 ml"
      },
      {
        "n": "Suco de tomate",
        "q": "120 ml"
      },
      {
        "n": "Limão",
        "q": "15 ml (Taiti)"
      },
      {
        "n": "Pimenta",
        "q": "3 gotas"
      },
      {
        "n": "Molho inglês",
        "q": "4 gotas"
      },
      {
        "n": "Sal",
        "q": "1 pitada"
      },
      {
        "n": "Gelo",
        "q": "cubos"
      }
    ],
    "steps": "1. Combine vodka, suco de tomate, limão, molho inglês, pimenta e sal em coqueteleira com gelo.\n2. Passe suavemente de um copo a outro (rolling) sem espumar demais.\n3. Sirva em copo alto com gelo.",
    "description": "Salgado, picante e encorpado: o coquetel de brunch mais famoso da história.",
    "story": "Aperfeiçoado por Fernand Petiot em Paris nos anos 1920 e no St. Regis de Nova York nos anos 1930.",
    "glass": "Copo alto",
    "technique": "Rolling (aerado suave)",
    "garnish": "Gomo de limão e pimenta",
    "shaken": false,
    "tags": [
      "Clássico",
      "Picante / Gengibre",
      "Longo",
      "Vodka"
    ]
  },
  {
    "name": "Red Snapper",
    "category": "Aperitivos",
    "ingredients": [
      {
        "n": "Gin",
        "q": "50 ml"
      },
      {
        "n": "Suco de tomate",
        "q": "120 ml"
      },
      {
        "n": "Limão",
        "q": "15 ml (Taiti)"
      },
      {
        "n": "Molho inglês",
        "q": "4 gotas"
      },
      {
        "n": "Pimenta",
        "q": "3 gotas"
      },
      {
        "n": "Sal",
        "q": "1 pitada"
      },
      {
        "n": "Gelo",
        "q": "cubos"
      }
    ],
    "steps": "1. Faça o rolling suave com gin, suco de tomate, limão e temperos com gelo.\n2. Sirva em copo alto com gelo fresco.",
    "description": "O Bloody Mary aromático feito com gin no lugar da vodka.",
    "story": "Nome original usado por Fernand Petiot no King Cole Bar de Nova York nos anos 1930 antes de Bloody Mary virar o padrão.",
    "glass": "Copo alto",
    "technique": "Rolling",
    "garnish": "Gomo de limão",
    "shaken": false,
    "tags": [
      "Clássico",
      "Picante / Gengibre",
      "Longo",
      "Gin"
    ]
  },
  {
    "name": "Caipirinha",
    "category": "Brasileiríssimos",
    "ingredients": [
      {
        "n": "Cachaça",
        "q": "50 ml (Prata)"
      },
      {
        "n": "Limão",
        "q": "1 unid (Taiti)"
      },
      {
        "n": "Açúcar",
        "q": "2 colheres"
      },
      {
        "n": "Gelo",
        "q": "cubos"
      }
    ],
    "steps": "1. Corte o limão em gomos retirando o miolo branco e macere suavemente com o açúcar no copo baixo.\n2. Encha de gelo, adicione a cachaça e misture bem.",
    "description": "Patrimônio brasileiro: cachaça, limão taiti fresco, açúcar e muito gelo.",
    "story": "Nascida no interior paulista entre o fim do século XIX e início do XX, tornou-se o maior símbolo da coquetelaria do Brasil no mundo.",
    "glass": "Copo baixo",
    "technique": "Macerado",
    "garnish": "Meia rodela de limão",
    "shaken": false,
    "tags": [
      "Clássico",
      "Brasileiro",
      "Cítrico / Ácido",
      "Refrescante",
      "Cachaça"
    ]
  },
  {
    "name": "Caipiroska",
    "category": "Brasileiríssimos",
    "ingredients": [
      {
        "n": "Vodka",
        "q": "50 ml"
      },
      {
        "n": "Limão",
        "q": "1 unid (Taiti)"
      },
      {
        "n": "Açúcar",
        "q": "2 colheres"
      },
      {
        "n": "Gelo",
        "q": "cubos"
      }
    ],
    "steps": "1. Macere o limão taiti cortado com açúcar no copo baixo.\n2. Encha de gelo, adicione vodka e agite ou mexa muito bem.",
    "description": "A versão neutra e cristalina da caipirinha preparada com vodka.",
    "story": "Popularizada nos bares brasileiros nos anos 1990 como alternativa suave para quem prefere o sabor limpo da fruta.",
    "glass": "Copo baixo",
    "technique": "Macerado",
    "garnish": "Rodela de limão",
    "shaken": false,
    "tags": [
      "Clássico",
      "Brasileiro",
      "Cítrico / Ácido",
      "Vodka"
    ]
  },
  {
    "name": "Caipirinha de Morango",
    "category": "Brasileiríssimos",
    "ingredients": [
      {
        "n": "Cachaça",
        "q": "50 ml (Prata)"
      },
      {
        "n": "Morango",
        "q": "5 unid"
      },
      {
        "n": "Limão",
        "q": "0.5 unid (Taiti)"
      },
      {
        "n": "Açúcar",
        "q": "2 colheres"
      },
      {
        "n": "Gelo",
        "q": "cubos"
      }
    ],
    "steps": "1. Macere morangos maduros e meio limão com açúcar no fundo do copo.\n2. Adicione bastante gelo, cachaça e bata rápido na coqueteleira ou mexa.",
    "description": "Morangos frescos macerados com toque cítrico de limão e cachaça prata.",
    "story": "A variação frutada mais pedida nas noites e praias brasileiras pelo contraste doce-ácido vibrante.",
    "glass": "Copo baixo",
    "technique": "Macerado",
    "garnish": "Morango fatiado na borda",
    "shaken": false,
    "tags": [
      "Clássico",
      "Brasileiro",
      "Frutado",
      "Doce",
      "Cachaça"
    ]
  },
  {
    "name": "Caipirinha de Maracujá",
    "category": "Brasileiríssimos",
    "ingredients": [
      {
        "n": "Cachaça",
        "q": "50 ml (Prata)"
      },
      {
        "n": "Maracujá",
        "q": "1 fruta"
      },
      {
        "n": "Limão",
        "q": "0.5 unid (Taiti)"
      },
      {
        "n": "Açúcar",
        "q": "2 colheres"
      },
      {
        "n": "Gelo",
        "q": "cubos"
      }
    ],
    "steps": "1. Coloque a polpa fresca de maracujá com açúcar e meio limão no copo ou shaker.\n2. Adicione cachaça e gelo, agite forte e sirva no copo baixo.",
    "description": "Maracujá azedinho e perfumado com cachaça prata e gelo.",
    "story": "Presença garantida em qualquer carta brasileira pela crocância das sementes e intensidade tropical.",
    "glass": "Copo baixo",
    "technique": "Shaker / Macerado",
    "garnish": "Meia casca ou sementes por cima",
    "shaken": true,
    "tags": [
      "Brasileiro",
      "Tropical",
      "Cítrico / Ácido",
      "Cachaça"
    ]
  },
  {
    "name": "Caipirinha de Abacaxi com Hortelã",
    "category": "Brasileiríssimos",
    "ingredients": [
      {
        "n": "Cachaça",
        "q": "50 ml (Prata)"
      },
      {
        "n": "Abacaxi",
        "q": "80 g"
      },
      {
        "n": "Hortelã",
        "q": "8 folhas"
      },
      {
        "n": "Limão",
        "q": "0.5 unid"
      },
      {
        "n": "Açúcar",
        "q": "1.5 colher"
      },
      {
        "n": "Gelo",
        "q": "cubos"
      }
    ],
    "steps": "1. Macere o abacaxi com açúcar e limão; pressione suavemente a hortelã.\n2. Adicione gelo e cachaça e agite na coqueteleira.",
    "description": "Abacaxi doce, hortelã fresca e cachaça prata em sintonia de verão.",
    "story": "Combinação clássica de suco brasileiro transformada em uma das caipirinhas mais refrescantes do país.",
    "glass": "Copo baixo",
    "technique": "Macerado + shaker",
    "garnish": "Folha de abacaxi e ramo de hortelã",
    "shaken": true,
    "tags": [
      "Brasileiro",
      "Refrescante",
      "Tropical",
      "Herbal / Hortelã",
      "Cachaça"
    ]
  },
  {
    "name": "Caipirinha de Kiwi",
    "category": "Brasileiríssimos",
    "ingredients": [
      {
        "n": "Cachaça",
        "q": "50 ml (Prata)"
      },
      {
        "n": "Kiwi",
        "q": "1 unid descascada"
      },
      {
        "n": "Açúcar",
        "q": "2 colheres"
      },
      {
        "n": "Gelo",
        "q": "cubos"
      }
    ],
    "steps": "1. Macere o kiwi descascado com açúcar no fundo do copo ou shaker.\n2. Adicione cachaça e muito gelo e agite bem.",
    "description": "Verde vibrante e textura suculenta de kiwi fresco com cachaça.",
    "story": "Clássico das cartas de praia desde os anos 2000 pela acidez delicada do kiwi combinada com a cana.",
    "glass": "Copo baixo",
    "technique": "Macerado + shaker",
    "garnish": "Rodelas de kiwi",
    "shaken": true,
    "tags": [
      "Brasileiro",
      "Frutado",
      "Refrescante",
      "Cachaça"
    ]
  },
  {
    "name": "Caipirinha de Tangerina com Pimenta",
    "category": "Brasileiríssimos",
    "ingredients": [
      {
        "n": "Cachaça",
        "q": "50 ml (Prata)"
      },
      {
        "n": "Tangerina",
        "q": "4 gomos"
      },
      {
        "n": "Pimenta",
        "q": "1 fatia fina (dedo-de-moça)"
      },
      {
        "n": "Açúcar",
        "q": "1.5 colher"
      },
      {
        "n": "Gelo",
        "q": "cubos"
      }
    ],
    "steps": "1. Macere os gomos de tangerina sem sementes com açúcar e uma fatia fina de pimenta.\n2. Bata com cachaça e gelo e sirva no copo baixo.",
    "description": "Doçura aromática da mexerica com picância leve de pimenta dedo-de-moça.",
    "story": "Receita querida dos bares autorais brasileiros que desperta o paladar sem esconder a cachaça.",
    "glass": "Copo baixo",
    "technique": "Macerado + shaker",
    "garnish": "Gomo de tangerina e pontinha de pimenta",
    "shaken": true,
    "tags": [
      "Brasileiro",
      "Picante / Gengibre",
      "Cítrico / Ácido",
      "Cachaça"
    ]
  },
  {
    "name": "Caipirinha de Caju",
    "category": "Brasileiríssimos",
    "ingredients": [
      {
        "n": "Cachaça",
        "q": "50 ml (Prata)"
      },
      {
        "n": "Caju",
        "q": "1 fruta"
      },
      {
        "n": "Limão",
        "q": "15 ml (Taiti)"
      },
      {
        "n": "Açúcar",
        "q": "2 colheres"
      },
      {
        "n": "Gelo",
        "q": "cubos"
      }
    ],
    "steps": "1. Macere o caju fatiado com açúcar e limão no fundo da coqueteleira.\n2. Adicione cachaça e gelo, agite bem e sirva sem coar.",
    "description": "Adstringência perfumada do caju fresco em tributo ao Nordeste.",
    "story": "Uma das frutas mais brasileiras de todas, que entrega perfume inconfundível junto da cachaça branca.",
    "glass": "Copo baixo",
    "technique": "Macerado + shaker",
    "garnish": "Fatia de caju na borda",
    "shaken": true,
    "tags": [
      "Brasileiro",
      "Frutado",
      "Tropical",
      "Cachaça"
    ]
  },
  {
    "name": "Caipiríssima",
    "category": "Brasileiríssimos",
    "ingredients": [
      {
        "n": "Rum",
        "q": "50 ml (Branco)"
      },
      {
        "n": "Limão",
        "q": "1 unid (Taiti)"
      },
      {
        "n": "Açúcar",
        "q": "2 colheres"
      },
      {
        "n": "Gelo",
        "q": "cubos"
      }
    ],
    "steps": "1. Macere o limão com açúcar no copo baixo.\n2. Encha com gelo, adicione rum branco e misture vigorosamente.",
    "description": "Caipirinha caribenha feita com rum branco no lugar da cachaça.",
    "story": "Popular em toda a América Latina e Caribe como irmã mais adocicada da caipirinha brasileira.",
    "glass": "Copo baixo",
    "technique": "Macerado",
    "garnish": "Rodela de limão",
    "shaken": false,
    "tags": [
      "Clássico",
      "Brasileiro",
      "Cítrico / Ácido",
      "Rum"
    ]
  },
  {
    "name": "Caipisakê de Morango",
    "category": "Brasileiríssimos",
    "ingredients": [
      {
        "n": "Saquê",
        "q": "70 ml"
      },
      {
        "n": "Morango",
        "q": "5 unid"
      },
      {
        "n": "Açúcar",
        "q": "1.5 colher"
      },
      {
        "n": "Gelo",
        "q": "cubos"
      }
    ],
    "steps": "1. Macere os morangos com açúcar no copo ou coqueteleira.\n2. Adicione gelo e saquê e bata rápido para gelar.",
    "description": "Leveza japonesa do saquê com morangos frescos macerados.",
    "story": "Fusão nipo-brasileira consagrada em São Paulo que combina baixa graduação alcoólica com frutas frescas.",
    "glass": "Copo baixo",
    "technique": "Macerado + shaker",
    "garnish": "Morango na borda",
    "shaken": true,
    "tags": [
      "Brasileiro",
      "Frutado",
      "Doce"
    ]
  },
  {
    "name": "Caipisakê de Kiwi",
    "category": "Brasileiríssimos",
    "ingredients": [
      {
        "n": "Saquê",
        "q": "70 ml"
      },
      {
        "n": "Kiwi",
        "q": "1 unid"
      },
      {
        "n": "Açúcar",
        "q": "1.5 colher"
      },
      {
        "n": "Gelo",
        "q": "cubos"
      }
    ],
    "steps": "1. Macere o kiwi descascado com açúcar.\n2. Adicione saquê e muito gelo, mexendo ou batendo suavemente.",
    "description": "Saquê gelado com acidez delicada e cor esmeralda do kiwi.",
    "story": "Clássico das cartas paulistanas de izakayas e bares de fim de tarde.",
    "glass": "Copo baixo",
    "technique": "Macerado",
    "garnish": "Fatia de kiwi",
    "shaken": false,
    "tags": [
      "Brasileiro",
      "Frutado",
      "Refrescante"
    ]
  },
  {
    "name": "Rabo de Galo",
    "category": "Brasileiríssimos",
    "ingredients": [
      {
        "n": "Cachaça",
        "q": "50 ml (Prata ou Ouro)"
      },
      {
        "n": "Vermute",
        "q": "30 ml (Tinto)"
      },
      {
        "n": "Gelo",
        "q": "cubos"
      }
    ],
    "steps": "1. Coloque cachaça e vermute tinto em copo baixo com gelo.\n2. Mexa por 20 segundos até resfriar e integrar.",
    "description": "O ícone absoluto dos botecos brasileiros: cachaça e vermute tinto.",
    "story": "Criado em São Paulo nos anos 1950 e traduzido literalmente de “cock-tail”, hoje faz parte oficial da lista da International Bartenders Association.",
    "glass": "Copo baixo",
    "technique": "Mexido no copo",
    "garnish": "Opcional: casca de laranja",
    "shaken": false,
    "tags": [
      "Clássico",
      "Brasileiro",
      "Forte",
      "Curto",
      "Cachaça",
      "Vermute & Aperitivos"
    ]
  },
  {
    "name": "Macunaíma",
    "category": "Brasileiríssimos",
    "ingredients": [
      {
        "n": "Cachaça",
        "q": "50 ml (Prata)"
      },
      {
        "n": "Fernet",
        "q": "7 ml"
      },
      {
        "n": "Limão",
        "q": "20 ml (Taiti)"
      },
      {
        "n": "Xarope de açúcar",
        "q": "15 ml"
      },
      {
        "n": "Gelo",
        "q": "para bater"
      }
    ],
    "steps": "1. Bata cachaça, Fernet, limão e xarope com muito gelo por 12 segundos.\n2. Coe para copo americano gelado sem gelo (ou sobre cubo único).",
    "description": "Cachaça, limão, açúcar e um golpe herbal de Fernet Branca.",
    "story": "Criado por Arnaldo Hirai no bar Boca de Ouro em São Paulo em 2014 — o drink autoral brasileiro mais replicado do país.",
    "glass": "Copo americano / Baixo",
    "technique": "Shaker",
    "garnish": "Sem guarnição",
    "shaken": true,
    "tags": [
      "Clássico",
      "Brasileiro",
      "Amargo",
      "Cítrico / Ácido",
      "Cachaça"
    ]
  },
  {
    "name": "Jorge Amado",
    "category": "Brasileiríssimos",
    "ingredients": [
      {
        "n": "Cachaça",
        "q": "50 ml (Gabriela / Cravo e canela)"
      },
      {
        "n": "Maracujá",
        "q": "1 fruta"
      },
      {
        "n": "Limão",
        "q": "15 ml (Taiti)"
      },
      {
        "n": "Açúcar",
        "q": "1.5 colher"
      },
      {
        "n": "Canela",
        "q": "1 pitada"
      },
      {
        "n": "Cravo-da-índia",
        "q": "1 unid"
      },
      {
        "n": "Gelo",
        "q": "cubos"
      }
    ],
    "steps": "1. Macere polpa de maracujá com açúcar e limão.\n2. Adicione cachaça temperada com cravo e canela e bata forte com gelo.",
    "description": "Maracujá com cachaça especiada de cravo e canela num abraço baiano.",
    "story": "Criado por Camila Paiva em Paraty em 2007 em homenagem ao escritor de Gabriela, Cravo e Canela.",
    "glass": "Copo baixo",
    "technique": "Shaker",
    "garnish": "Meia casca de maracujá e pau de canela",
    "shaken": true,
    "tags": [
      "Clássico",
      "Brasileiro",
      "Tropical",
      "Cachaça"
    ]
  },
  {
    "name": "Caju Amigo",
    "category": "Brasileiríssimos",
    "ingredients": [
      {
        "n": "Cachaça",
        "q": "50 ml (Prata)"
      },
      {
        "n": "Suco de caju",
        "q": "50 ml"
      },
      {
        "n": "Caju",
        "q": "1 fatia"
      },
      {
        "n": "Limão",
        "q": "15 ml (Taiti)"
      },
      {
        "n": "Açúcar",
        "q": "10 ml xarope"
      },
      {
        "n": "Gelo",
        "q": "para bater"
      }
    ],
    "steps": "1. Bata cachaça, suco de caju, limão e açúcar com muito gelo.\n2. Coe sobre gelo novo no copo baixo e sirva com um pedaço de caju para morder após o gole.",
    "description": "Cachaça prata com acidez aveludada de caju fresco e limão.",
    "story": "Imortalizado nos anos 2000 no balcão do Bar Astor em São Paulo como um dos marcos da coquetelaria nacional contemporânea.",
    "glass": "Copo baixo",
    "technique": "Shaker",
    "garnish": "Caju em conserva ou fresco no palito",
    "shaken": true,
    "tags": [
      "Clássico",
      "Brasileiro",
      "Frutado",
      "Cachaça"
    ]
  },
  {
    "name": "Bombeirinho",
    "category": "Brasileiríssimos",
    "ingredients": [
      {
        "n": "Cachaça",
        "q": "50 ml (Prata)"
      },
      {
        "n": "Xarope de groselha",
        "q": "20 ml"
      },
      {
        "n": "Limão",
        "q": "15 ml (Taiti)"
      },
      {
        "n": "Gelo",
        "q": "cubos"
      }
    ],
    "steps": "1. Bata ou mexa bem cachaça prata, groselha e gotas de limão com gelo.\n2. Sirva bem gelado em copo baixo ou americano.",
    "description": "Vermelho vivo de botequim: cachaça, groselha doce e corte de limão.",
    "story": "Clássico popular dos balcões paulistas batizado pela cor vermelha brilhante que lembra o uniforme dos bombeiros.",
    "glass": "Copo americano / Baixo",
    "technique": "Mexido ou shaker",
    "garnish": "Rodela de limão",
    "shaken": false,
    "tags": [
      "Clássico",
      "Brasileiro",
      "Doce",
      "Cachaça"
    ]
  },
  {
    "name": "Capeta",
    "category": "Brasileiríssimos",
    "ingredients": [
      {
        "n": "Cachaça",
        "q": "50 ml (ou Vodka)"
      },
      {
        "n": "Leite condensado",
        "q": "35 ml"
      },
      {
        "n": "Chocolate",
        "q": "15 g (em pó)"
      },
      {
        "n": "Canela",
        "q": "1 pitada"
      },
      {
        "n": "Morango",
        "q": "2 unid"
      },
      {
        "n": "Gelo",
        "q": "cubos"
      }
    ],
    "steps": "1. Bata todos os ingredientes com bastante gelo no liquidificador ou shaker até ficar cremoso.\n2. Sirva com canela polvilhada por cima.",
    "description": "Cremoso, doce e especiado: patrimônio das festas e praias do Nordeste.",
    "story": "Nascido nas praias baianas e famoso nos carnavais do Brasil inteiro pela energia doce e enganosamente suave.",
    "glass": "Copo alto / Taça",
    "technique": "Batido",
    "garnish": "Canela em pó",
    "shaken": true,
    "tags": [
      "Brasileiro",
      "Cremoso",
      "Doce",
      "Cachaça"
    ]
  },
  {
    "name": "Batida de Coco",
    "category": "Brasileiríssimos",
    "ingredients": [
      {
        "n": "Cachaça",
        "q": "50 ml (Prata)"
      },
      {
        "n": "Leite de coco",
        "q": "50 ml"
      },
      {
        "n": "Leite condensado",
        "q": "40 ml"
      },
      {
        "n": "Coco ralado",
        "q": "1 colher"
      },
      {
        "n": "Gelo",
        "q": "cubos"
      }
    ],
    "steps": "1. Bata cachaça, leite de coco, leite condensado e gelo no liquidificador até ficar liso.\n2. Sirva gelado polvilhado com coco ralado.",
    "description": "A batida brasileira mais clássica: doce, tropical e aveludada.",
    "story": "Tradição das festas de rua, praias e botecos cariocas desde a metade do século XX.",
    "glass": "Copo baixo / Taça",
    "technique": "Batido",
    "garnish": "Coco ralado",
    "shaken": true,
    "tags": [
      "Clássico",
      "Brasileiro",
      "Cremoso",
      "Tropical",
      "Cachaça"
    ]
  },
  {
    "name": "Batida de Maracujá",
    "category": "Brasileiríssimos",
    "ingredients": [
      {
        "n": "Cachaça",
        "q": "50 ml (Prata)"
      },
      {
        "n": "Maracujá",
        "q": "1 fruta"
      },
      {
        "n": "Leite condensado",
        "q": "40 ml"
      },
      {
        "n": "Gelo",
        "q": "cubos"
      }
    ],
    "steps": "1. Bata a polpa do maracujá rapidamente com cachaça, leite condensado e gelo.\n2. Coe (ou sirva com sementes) em copo bem gelado.",
    "description": "Creme doce-azedo de maracujá fresco batido com leite condensado e cachaça.",
    "story": "Companheira inseparável das batidas de coco em quiosques de praia e churrascos pelo Brasil.",
    "glass": "Copo baixo / Taça",
    "technique": "Batido",
    "garnish": "Sementes de maracujá",
    "shaken": true,
    "tags": [
      "Brasileiro",
      "Cremoso",
      "Tropical",
      "Cachaça"
    ]
  },
  {
    "name": "Batida de Morango",
    "category": "Brasileiríssimos",
    "ingredients": [
      {
        "n": "Vodka",
        "q": "50 ml"
      },
      {
        "n": "Morango",
        "q": "5 unid"
      },
      {
        "n": "Leite condensado",
        "q": "40 ml"
      },
      {
        "n": "Gelo",
        "q": "cubos"
      }
    ],
    "steps": "1. Bata morangos, vodka, leite condensado e gelo até ficar homogêneo e rosado.\n2. Sirva na taça ou copo baixo.",
    "description": "Batida rosada e cremosa de morangos frescos com vodka.",
    "story": "Favorita absoluta das festas brasileiras pela textura suave de milkshake frutado.",
    "glass": "Taça / Copo baixo",
    "technique": "Batido",
    "garnish": "Morango na borda",
    "shaken": true,
    "tags": [
      "Brasileiro",
      "Cremoso",
      "Frutado",
      "Doce",
      "Vodka"
    ]
  },
  {
    "name": "Quentão Gelado da Serra",
    "category": "Brasileiríssimos",
    "ingredients": [
      {
        "n": "Cachaça",
        "q": "50 ml (Ouro)"
      },
      {
        "n": "Gengibre",
        "q": "3 fatias"
      },
      {
        "n": "Canela",
        "q": "1 pau"
      },
      {
        "n": "Cravo-da-índia",
        "q": "2 unid"
      },
      {
        "n": "Laranja",
        "q": "2 cascas"
      },
      {
        "n": "Xarope de açúcar",
        "q": "20 ml"
      },
      {
        "n": "Gelo",
        "q": "para bater"
      }
    ],
    "steps": "1. Macere gengibre e especiarias com xarope no fundo da coqueteleira.\n2. Adicione cachaça ouro, casca de laranja e gelo e bata forte.\n3. Coe duas vezes sobre gelo grande.",
    "description": "Os aromas juninos de gengibre, cravo, canela e laranja servidos bem gelados.",
    "story": "Releitura de balcão que leva as especiarias acolhedoras do quentão tradicional para as noites quentes.",
    "glass": "Copo baixo",
    "technique": "Macerado + shaker",
    "garnish": "Casca de laranja e canela em pau",
    "shaken": true,
    "tags": [
      "Autoral",
      "Brasileiro",
      "Picante / Gengibre",
      "Cachaça"
    ]
  },
  {
    "name": "Maria Mole",
    "category": "Brasileiríssimos",
    "ingredients": [
      {
        "n": "Conhaque",
        "q": "45 ml"
      },
      {
        "n": "Vermute",
        "q": "45 ml (Branco)"
      },
      {
        "n": "Gelo",
        "q": "cubos"
      }
    ],
    "steps": "1. Despeje partes iguais de conhaque nacional (ou brandy) e vermute branco sobre gelo.\n2. Mexa suavemente até gelar.",
    "description": "Clássico boêmio dos botecos antigos: conhaque e vermute branco sobre gelo.",
    "story": "Companheiro histórico do Rabo de Galo nos balcões antigos de São Paulo e Minas Gerais.",
    "glass": "Copo americano / Baixo",
    "technique": "Mexido no copo",
    "garnish": "Sem guarnição",
    "shaken": false,
    "tags": [
      "Clássico",
      "Brasileiro",
      "Forte",
      "Conhaque",
      "Vermute & Aperitivos"
    ]
  },
  {
    "name": "Submarino",
    "category": "Brasileiríssimos",
    "ingredients": [
      {
        "n": "Cerveja",
        "q": "300 ml (Pilsen gelada)"
      },
      {
        "n": "Cachaça",
        "q": "40 ml (Ouro ou Steinhaeger)"
      }
    ],
    "steps": "1. Encha uma caneca de chopp com cerveja trincando.\n2. Encha um copo de shot com cachaça ouro, vire com cuidado e apoie emborcado no fundo da caneca.",
    "description": "Caneca de cerveja trincando com dose submersa que se mistura a cada gole.",
    "story": "Clássico dos bares alemães do Sul do Brasil e botecos tradicionais pelo ritual cênico do copinho submerso.",
    "glass": "Caneca de chopp + Shot",
    "technique": "Emborcado",
    "garnish": "Ritual no copo",
    "shaken": false,
    "tags": [
      "Clássico",
      "Brasileiro",
      "Forte",
      "Cachaça"
    ]
  },
  {
    "name": "Cozumel",
    "category": "Brasileiríssimos",
    "ingredients": [
      {
        "n": "Cerveja",
        "q": "330 ml (Pilsen ou Lager)"
      },
      {
        "n": "Limão",
        "q": "35 ml (Taiti)"
      },
      {
        "n": "Sal",
        "q": "na borda"
      },
      {
        "n": "Gelo",
        "q": "cubos"
      }
    ],
    "steps": "1. Passe limão na borda de uma caneca grande e encoste no sal.\n2. Encha com gelo, suco de limão fresco e complete devagar com cerveja gelada.",
    "description": "Cerveja gelada com limão espremido, muito gelo e borda de sal.",
    "story": "Inspirado na michelada mexicana e adotado em peso pelos bares do Centro-Oeste brasileiro como o drink mais refrescante do calor.",
    "glass": "Caneca / Copo alto",
    "technique": "Montado na caneca",
    "garnish": "Borda de sal e limão",
    "shaken": false,
    "tags": [
      "Brasileiro",
      "Refrescante",
      "Cítrico / Ácido",
      "Longo"
    ]
  },
  {
    "name": "Lagoa Azul",
    "category": "Brasileiríssimos",
    "ingredients": [
      {
        "n": "Vodka",
        "q": "45 ml"
      },
      {
        "n": "Curaçau Blue",
        "q": "20 ml"
      },
      {
        "n": "Refrigerante de limão",
        "q": "120 ml"
      },
      {
        "n": "Limão",
        "q": "15 ml (Taiti)"
      },
      {
        "n": "Gelo",
        "q": "cubos"
      }
    ],
    "steps": "1. Encha o copo alto ou taça com gelo.\n2. Adicione vodka, Curaçau Blue e limão e complete com refrigerante de limão.",
    "description": "Azul elétrico vibrante de laranja curaçau, vodka e soda de limão.",
    "story": "Sucesso absoluto nas praias e formaturas brasileiras desde os anos 1990 pela cor turquesa cinematográfica.",
    "glass": "Copo alto / Taça",
    "technique": "Montado no copo",
    "garnish": "Rodela de limão e cereja",
    "shaken": false,
    "tags": [
      "Clássico",
      "Brasileiro",
      "Refrescante",
      "Doce",
      "Vodka"
    ]
  },
  {
    "name": "Cachaça Sour",
    "category": "Brasileiríssimos",
    "ingredients": [
      {
        "n": "Cachaça",
        "q": "50 ml (Ouro ou Prata)"
      },
      {
        "n": "Limão",
        "q": "25 ml (Taiti)"
      },
      {
        "n": "Xarope de açúcar",
        "q": "20 ml"
      },
      {
        "n": "Gelo",
        "q": "para bater"
      }
    ],
    "steps": "1. Bata cachaça, suco de limão e xarope de açúcar com muito gelo por 12 segundos.\n2. Coe duas vezes sobre gelo novo ou em taça coupe.",
    "description": "A alma da caipirinha com textura sedosa e coada da coqueteleira.",
    "story": "Mostra a versatilidade da cachaça em estrutura clássica de sour sem precisar de ingredientes importados.",
    "glass": "Copo baixo / Coupe",
    "technique": "Shaker",
    "garnish": "Rodela de limão",
    "shaken": true,
    "tags": [
      "Brasileiro",
      "Cítrico / Ácido",
      "Curto",
      "Cachaça"
    ]
  },
  {
    "name": "Negroni Brasileiro",
    "category": "Brasileiríssimos",
    "ingredients": [
      {
        "n": "Cachaça",
        "q": "30 ml (Ouro)"
      },
      {
        "n": "Campari",
        "q": "30 ml"
      },
      {
        "n": "Vermute",
        "q": "30 ml (Tinto)"
      },
      {
        "n": "Laranja",
        "q": "1 casca"
      },
      {
        "n": "Gelo",
        "q": "1 cubo grande"
      }
    ],
    "steps": "1. Mexa cachaça ouro, Campari e vermute tinto em mixing glass com gelo.\n2. Coe sobre pedra grande de gelo e perfume com casca de laranja.",
    "description": "O clássico italiano com cachaça envelhecida trazendo baunilha e madeira.",
    "story": "Releitura nacional já presente nas cartas premiadas do país inteiro, celebrando o encontro da cana envelhecida com o bitter italiano.",
    "glass": "Old fashioned",
    "technique": "Mexido",
    "garnish": "Casca de laranja",
    "shaken": false,
    "tags": [
      "Brasileiro",
      "Amargo",
      "Forte",
      "Curto",
      "Cachaça"
    ]
  },
  {
    "name": "Bossa Nova",
    "category": "Brasileiríssimos",
    "ingredients": [
      {
        "n": "Cachaça",
        "q": "30 ml (Ouro)"
      },
      {
        "n": "Rum",
        "q": "20 ml (Branco)"
      },
      {
        "n": "Maracujá",
        "q": "1 fruta"
      },
      {
        "n": "Suco de abacaxi",
        "q": "45 ml"
      },
      {
        "n": "Limão",
        "q": "15 ml (Taiti)"
      },
      {
        "n": "Xarope de açúcar",
        "q": "15 ml"
      },
      {
        "n": "Gelo",
        "q": "para bater"
      }
    ],
    "steps": "1. Bata cachaça, rum, polpa de maracujá, suco de abacaxi, limão e xarope com gelo.\n2. Coe sobre gelo em copo alto ou taça.",
    "description": "Sinfonia tropical carioca de cachaça ouro, rum, maracujá e abacaxi.",
    "story": "Criado para homenagear a cadência suave e luminosa do Rio de Janeiro dos anos 1960.",
    "glass": "Taça Hurricane / Copo alto",
    "technique": "Shaker",
    "garnish": "Folha de abacaxi e hortelã",
    "shaken": true,
    "tags": [
      "Brasileiro",
      "Tropical",
      "Frutado",
      "Cachaça",
      "Rum"
    ]
  },
  {
    "name": "Mai Tai",
    "category": "Tiki & Tropicais",
    "ingredients": [
      {
        "n": "Rum",
        "q": "60 ml (Escuro e Branco)"
      },
      {
        "n": "Cointreau",
        "q": "15 ml"
      },
      {
        "n": "Orgeat",
        "q": "15 ml"
      },
      {
        "n": "Limão",
        "q": "25 ml (Taiti)"
      },
      {
        "n": "Hortelã",
        "q": "1 ramo"
      },
      {
        "n": "Gelo",
        "q": "triturado"
      }
    ],
    "steps": "1. Bata rum, Cointreau, orgeat e limão com gelo.\n2. Coe sobre copo baixo lotado de gelo triturado.\n3. Decore com meia casca de limão invertida e ramo farto de hortelã.",
    "description": "O ícone máximo da cultura Tiki: rum complexo, laranja, limão e amêndoa orgeat.",
    "story": "Criado por Trader Vic em 1944 na Califórnia; ao provar, amigos taitianos exclamaram “Maita’i roa ae!” — “fora deste mundo!”.",
    "glass": "Copo baixo",
    "technique": "Shaker",
    "garnish": "Meia casca de limão e hortelã",
    "shaken": true,
    "tags": [
      "Clássico",
      "Tropical",
      "Forte",
      "Rum"
    ]
  },
  {
    "name": "Piña Colada",
    "category": "Tiki & Tropicais",
    "ingredients": [
      {
        "n": "Rum",
        "q": "50 ml (Branco)"
      },
      {
        "n": "Suco de abacaxi",
        "q": "90 ml"
      },
      {
        "n": "Leite de coco",
        "q": "40 ml"
      },
      {
        "n": "Creme de leite",
        "q": "20 ml"
      },
      {
        "n": "Abacaxi",
        "q": "1 fatia"
      },
      {
        "n": "Gelo",
        "q": "cubos"
      }
    ],
    "steps": "1. Bata rum, suco de abacaxi, leite de coco, creme e gelo no liquidificador ou shaker forte.\n2. Sirva em taça hurricane e decore com abacaxi.",
    "description": "Cremosidade tropical porto-riquenha de rum, abacaxi doce e coco.",
    "story": "Drink oficial de Porto Rico desde os anos 1950 e símbolo eterno das férias à beira-mar.",
    "glass": "Taça Hurricane",
    "technique": "Batido",
    "garnish": "Fatia de abacaxi e cereja",
    "shaken": true,
    "tags": [
      "Clássico",
      "Tropical",
      "Cremoso",
      "Doce",
      "Rum"
    ]
  },
  {
    "name": "Zombie",
    "category": "Tiki & Tropicais",
    "ingredients": [
      {
        "n": "Rum",
        "q": "60 ml (Branco e Escuro)"
      },
      {
        "n": "Falernum",
        "q": "15 ml"
      },
      {
        "n": "Suco de grapefruit",
        "q": "30 ml"
      },
      {
        "n": "Xarope de canela",
        "q": "15 ml"
      },
      {
        "n": "Limão",
        "q": "20 ml (Taiti)"
      },
      {
        "n": "Grenadine",
        "q": "10 ml"
      },
      {
        "n": "Absinto",
        "q": "1 dash"
      },
      {
        "n": "Angostura",
        "q": "1 dash"
      },
      {
        "n": "Hortelã",
        "q": "1 ramo"
      },
      {
        "n": "Gelo",
        "q": "triturado"
      }
    ],
    "steps": "1. Bata todos os ingredientes com bastante gelo.\n2. Coe para copo alto cheio de gelo triturado e decore com hortelã.",
    "description": "Lendário elixir tiki especiado de múltiplos runs, canela, grapefruit e absinto.",
    "story": "Inventado em 1934 por Donn Beach em Hollywood para curar um cliente com ressaca — que depois disse ter virado um zumbi.",
    "glass": "Copo Tiki / Alto",
    "technique": "Shaker",
    "garnish": "Hortelã e cereja",
    "shaken": true,
    "tags": [
      "Clássico",
      "Tropical",
      "Forte",
      "Rum"
    ]
  },
  {
    "name": "Jungle Bird",
    "category": "Tiki & Tropicais",
    "ingredients": [
      {
        "n": "Rum",
        "q": "45 ml (Escuro)"
      },
      {
        "n": "Campari",
        "q": "20 ml"
      },
      {
        "n": "Suco de abacaxi",
        "q": "45 ml"
      },
      {
        "n": "Limão",
        "q": "15 ml (Taiti)"
      },
      {
        "n": "Xarope de açúcar",
        "q": "15 ml"
      },
      {
        "n": "Abacaxi",
        "q": "1 folha"
      },
      {
        "n": "Gelo",
        "q": "cubos"
      }
    ],
    "steps": "1. Bata rum escuro, Campari, suco de abacaxi, limão e xarope com gelo.\n2. Coe sobre gelo grande em copo baixo.",
    "description": "Tropical agridoce inconfundível unindo abacaxi espumoso e amargor de Campari.",
    "story": "Criado em 1978 no Aviary Bar do Hilton de Kuala Lumpur na Malásia, resgatado pela coquetelaria moderna como obra-prima Tiki.",
    "glass": "Copo baixo",
    "technique": "Shaker",
    "garnish": "Folha e pedaço de abacaxi",
    "shaken": true,
    "tags": [
      "Clássico",
      "Tropical",
      "Amargo",
      "Rum"
    ]
  },
  {
    "name": "Painkiller",
    "category": "Tiki & Tropicais",
    "ingredients": [
      {
        "n": "Rum",
        "q": "60 ml (Escuro)"
      },
      {
        "n": "Suco de abacaxi",
        "q": "100 ml"
      },
      {
        "n": "Suco de laranja",
        "q": "30 ml"
      },
      {
        "n": "Creme de coco",
        "q": "30 ml"
      },
      {
        "n": "Noz-moscada",
        "q": "1 pitada"
      },
      {
        "n": "Abacaxi",
        "q": "1 fatia"
      },
      {
        "n": "Gelo",
        "q": "cubos"
      }
    ],
    "steps": "1. Bata rum escuro, sucos de abacaxi e laranja e creme de coco com muito gelo.\n2. Sirva em copo cheio de gelo e rale noz-moscada fresca por cima.",
    "description": "Coco cremoso, abacaxi, laranja e noz-moscada ralada na hora.",
    "story": "Nascido nos anos 1970 no Soggy Dollar Bar nas Ilhas Virgens Britânicas, onde os clientes literalmente nadavam até o bar.",
    "glass": "Copo alto / Caneca",
    "technique": "Shaker",
    "garnish": "Fatia de abacaxi e noz-moscada",
    "shaken": true,
    "tags": [
      "Clássico",
      "Tropical",
      "Cremoso",
      "Doce",
      "Rum"
    ]
  },
  {
    "name": "Hurricane",
    "category": "Tiki & Tropicais",
    "ingredients": [
      {
        "n": "Rum",
        "q": "60 ml (Escuro e Branco)"
      },
      {
        "n": "Maracujá",
        "q": "1 fruta"
      },
      {
        "n": "Suco de laranja",
        "q": "30 ml"
      },
      {
        "n": "Limão",
        "q": "20 ml (Taiti)"
      },
      {
        "n": "Xarope de açúcar",
        "q": "15 ml"
      },
      {
        "n": "Grenadine",
        "q": "10 ml"
      },
      {
        "n": "Laranja",
        "q": "1 rodela"
      },
      {
        "n": "Cereja",
        "q": "1 unid"
      },
      {
        "n": "Gelo",
        "q": "cubos"
      }
    ],
    "steps": "1. Bata todos os ingredientes com bastante gelo.\n2. Coe em taça hurricane com gelo novo e decore com laranja e cereja.",
    "description": "Clássico rubi de Nova Orleans com rum, maracujá intenso e cítricos.",
    "story": "Criado por Pat O’Brien em Nova Orleans nos anos 1940 quando precisou escoar grandes lotes de rum durante a escassez de whisky.",
    "glass": "Taça Hurricane",
    "technique": "Shaker",
    "garnish": "Rodela de laranja e cereja",
    "shaken": true,
    "tags": [
      "Clássico",
      "Tropical",
      "Frutado",
      "Longo",
      "Rum"
    ]
  },
  {
    "name": "Planter's Punch",
    "category": "Tiki & Tropicais",
    "ingredients": [
      {
        "n": "Rum",
        "q": "60 ml (Escuro)"
      },
      {
        "n": "Suco de laranja",
        "q": "45 ml"
      },
      {
        "n": "Suco de abacaxi",
        "q": "45 ml"
      },
      {
        "n": "Limão",
        "q": "20 ml (Taiti)"
      },
      {
        "n": "Grenadine",
        "q": "15 ml"
      },
      {
        "n": "Angostura",
        "q": "2 dashes"
      },
      {
        "n": "Gelo",
        "q": "cubos"
      }
    ],
    "steps": "1. Bata todos os ingredientes com muito gelo.\n2. Coe para copo alto com gelo fresco e finalize com Angostura e hortelã.",
    "description": "Ponche jamaicano frutado e aromático de rum escuro e especiarias.",
    "story": "Registrado em 1878 na revista Punch de Londres seguindo a rima tradicional do Caribe: um de azedo, dois de doce, três de forte e quatro de fraco.",
    "glass": "Copo alto",
    "technique": "Shaker",
    "garnish": "Laranja, cereja e hortelã",
    "shaken": true,
    "tags": [
      "Clássico",
      "Tropical",
      "Frutado",
      "Rum"
    ]
  },
  {
    "name": "Blue Hawaiian",
    "category": "Tiki & Tropicais",
    "ingredients": [
      {
        "n": "Rum",
        "q": "45 ml (Branco)"
      },
      {
        "n": "Curaçau Blue",
        "q": "20 ml"
      },
      {
        "n": "Suco de abacaxi",
        "q": "80 ml"
      },
      {
        "n": "Creme de coco",
        "q": "30 ml"
      },
      {
        "n": "Abacaxi",
        "q": "1 fatia"
      },
      {
        "n": "Cereja",
        "q": "1 unid"
      },
      {
        "n": "Gelo",
        "q": "cubos"
      }
    ],
    "steps": "1. Bata rum, Curaçau Blue, suco de abacaxi e creme de coco com gelo.\n2. Sirva em taça hurricane azul-turquesa com abacaxi.",
    "description": "Piña Colada azul-turquesa com toque cítrico de Curaçau Blue.",
    "story": "Criado em 1957 em Waikiki, Havaí, por Harry Yee no Hilton Hawaiian Village — ícone visual da era de ouro havaiana.",
    "glass": "Taça Hurricane",
    "technique": "Batido / Shaker",
    "garnish": "Fatia de abacaxi e cereja",
    "shaken": true,
    "tags": [
      "Clássico",
      "Tropical",
      "Cremoso",
      "Doce",
      "Rum"
    ]
  },
  {
    "name": "Bahama Mama",
    "category": "Tiki & Tropicais",
    "ingredients": [
      {
        "n": "Rum",
        "q": "30 ml (Dourado)"
      },
      {
        "n": "Licor de coco",
        "q": "20 ml"
      },
      {
        "n": "Licor de café",
        "q": "15 ml"
      },
      {
        "n": "Suco de abacaxi",
        "q": "60 ml"
      },
      {
        "n": "Suco de laranja",
        "q": "45 ml"
      },
      {
        "n": "Limão",
        "q": "15 ml (Taiti)"
      },
      {
        "n": "Grenadine",
        "q": "10 ml"
      },
      {
        "n": "Gelo",
        "q": "cubos"
      }
    ],
    "steps": "1. Bata os runs/licores e sucos com gelo.\n2. Sirva em taça hurricane e finalize com grenadine.",
    "description": "Mistura caribenha rica de coco, abacaxi, laranja e toque surpreendente de café.",
    "story": "Famoso nos resorts das Bahamas desde os anos 1960 como o drink tropical com personalidade achocolatada de fundo.",
    "glass": "Taça Hurricane",
    "technique": "Shaker",
    "garnish": "Abacaxi e cereja",
    "shaken": true,
    "tags": [
      "Clássico",
      "Tropical",
      "Frutado",
      "Doce",
      "Rum"
    ]
  },
  {
    "name": "Singapore Sling",
    "category": "Tiki & Tropicais",
    "ingredients": [
      {
        "n": "Gin",
        "q": "30 ml"
      },
      {
        "n": "Cherry Brandy",
        "q": "15 ml"
      },
      {
        "n": "Cointreau",
        "q": "7 ml"
      },
      {
        "n": "Bénédictine",
        "q": "7 ml"
      },
      {
        "n": "Suco de abacaxi",
        "q": "90 ml"
      },
      {
        "n": "Limão",
        "q": "15 ml (Taiti)"
      },
      {
        "n": "Grenadine",
        "q": "10 ml"
      },
      {
        "n": "Angostura",
        "q": "1 dash"
      },
      {
        "n": "Gelo",
        "q": "cubos"
      }
    ],
    "steps": "1. Bata todos os ingredientes com gelo até formar leve espuma de abacaxi.\n2. Coe em copo alto com gelo fresco.",
    "description": "O lendário drink rosado de Singapura com gin, cereja, ervas e abacaxi.",
    "story": "Criado por volta de 1915 por Ngiam Tong Boon no Long Bar do Raffles Hotel em Singapura como um clássico de salão elegante.",
    "glass": "Copo alto / Hurricane",
    "technique": "Shaker",
    "garnish": "Fatia de abacaxi e cereja",
    "shaken": true,
    "tags": [
      "Clássico",
      "Tropical",
      "Frutado",
      "Longo",
      "Gin"
    ]
  },
  {
    "name": "Saturn",
    "category": "Tiki & Tropicais",
    "ingredients": [
      {
        "n": "Gin",
        "q": "45 ml"
      },
      {
        "n": "Limão",
        "q": "20 ml (Siciliano)"
      },
      {
        "n": "Xarope de maracujá",
        "q": "15 ml"
      },
      {
        "n": "Orgeat",
        "q": "10 ml"
      },
      {
        "n": "Falernum",
        "q": "10 ml"
      },
      {
        "n": "Gelo",
        "q": "triturado"
      }
    ],
    "steps": "1. Bata gin, limão siciliano, maracujá, orgeat e falernum com gelo.\n2. Sirva em taça coupe ou copo baixo com gelo picado.",
    "description": "Raro clássico Tiki à base de gin com maracujá, amêndoa orgeat e especiarias.",
    "story": "Vencedor do campeonato mundial da IBA em 1967 nas mãos do californiano Popo Galsini, batizado em plena corrida espacial.",
    "glass": "Taça Coupe / Copo baixo",
    "technique": "Shaker",
    "garnish": "Espiral de limão com cereja (planeta e anel)",
    "shaken": true,
    "tags": [
      "Clássico",
      "Tropical",
      "Cítrico / Ácido",
      "Gin"
    ]
  },
  {
    "name": "Chartreuse Swizzle",
    "category": "Tiki & Tropicais",
    "ingredients": [
      {
        "n": "Chartreuse",
        "q": "45 ml (Verde)"
      },
      {
        "n": "Suco de abacaxi",
        "q": "30 ml"
      },
      {
        "n": "Limão",
        "q": "20 ml (Taiti)"
      },
      {
        "n": "Falernum",
        "q": "15 ml"
      },
      {
        "n": "Hortelã",
        "q": "1 ramo"
      },
      {
        "n": "Noz-moscada",
        "q": "1 pitada"
      },
      {
        "n": "Gelo",
        "q": "triturado"
      }
    ],
    "steps": "1. Coloque todos os ingredientes em copo alto com gelo triturado.\n2. Gire vigorosamente com colher bailarina (swizzle) até o copo gelar por fora.\n3. Decore com hortelã e noz-moscada.",
    "description": "Verde vibrante e herbáceo: 130 ervas do Chartreuse domadas por abacaxi e limão.",
    "story": "Criado por Marco Dionysos em 2002 em São Francisco (Smuggler’s Cove canon), considerado um milagre de equilíbrio Tiki moderno.",
    "glass": "Copo alto",
    "technique": "Swizzle em gelo picado",
    "garnish": "Hortelã e noz-moscada",
    "shaken": false,
    "tags": [
      "Clássico",
      "Tropical",
      "Herbal / Hortelã",
      "Forte"
    ]
  },
  {
    "name": "Navy Grog",
    "category": "Tiki & Tropicais",
    "ingredients": [
      {
        "n": "Rum",
        "q": "60 ml (Escuro e Dourado)"
      },
      {
        "n": "Suco de grapefruit",
        "q": "25 ml"
      },
      {
        "n": "Limão",
        "q": "25 ml (Taiti)"
      },
      {
        "n": "Mel",
        "q": "20 ml (diluído)"
      },
      {
        "n": "Gelo",
        "q": "triturado"
      }
    ],
    "steps": "1. Bata os runs com suco de grapefruit, limão e xarope de mel com gelo.\n2. Sirva em copo baixo cheio de gelo triturado.",
    "description": "Potência naval de runs envelhecidos com mel e acidez seca de grapefruit.",
    "story": "Inspirado na ração diária de rum da Marinha Real Britânica e elevado à perfeição por Donn Beach nos anos 1940.",
    "glass": "Copo baixo",
    "technique": "Shaker",
    "garnish": "Hortelã e casca de limão",
    "shaken": true,
    "tags": [
      "Clássico",
      "Tropical",
      "Forte",
      "Rum"
    ]
  },
  {
    "name": "Suffering Bastard",
    "category": "Tiki & Tropicais",
    "ingredients": [
      {
        "n": "Gin",
        "q": "30 ml"
      },
      {
        "n": "Conhaque",
        "q": "30 ml"
      },
      {
        "n": "Limão",
        "q": "15 ml (Taiti)"
      },
      {
        "n": "Ginger beer",
        "q": "90 ml"
      },
      {
        "n": "Angostura",
        "q": "2 dashes"
      },
      {
        "n": "Hortelã",
        "q": "1 ramo"
      },
      {
        "n": "Gelo",
        "q": "cubos"
      }
    ],
    "steps": "1. Bata gin, conhaque, limão e Angostura com gelo.\n2. Coe em copo alto com gelo novo e complete com ginger beer.",
    "description": "Gin + conhaque com gengibre picante e hortelã — cura clássica de ressaca.",
    "story": "Criado em 1942 por Joe Scialom no Shepheard’s Hotel no Cairo para aliviar as tropas aliadas durante a Segunda Guerra.",
    "glass": "Copo alto",
    "technique": "Shaker + build",
    "garnish": "Ramo de hortelã e laranja",
    "shaken": true,
    "tags": [
      "Clássico",
      "Picante / Gengibre",
      "Forte",
      "Gin",
      "Conhaque"
    ]
  },
  {
    "name": "Queen's Park Swizzle",
    "category": "Tiki & Tropicais",
    "ingredients": [
      {
        "n": "Rum",
        "q": "60 ml (Dourado)"
      },
      {
        "n": "Hortelã",
        "q": "12 folhas"
      },
      {
        "n": "Limão",
        "q": "25 ml (Taiti)"
      },
      {
        "n": "Xarope de açúcar",
        "q": "20 ml"
      },
      {
        "n": "Angostura",
        "q": "4 dashes"
      },
      {
        "n": "Gelo",
        "q": "triturado"
      }
    ],
    "steps": "1. Coloque hortelã, xarope, limão e rum em copo alto com gelo triturado.\n2. Faça o swizzle até formar geada no copo e coroe com 4 dashes generosos de Angostura.",
    "description": "O “Mojito de Trinidad” com rum envelhecido, gelo picado e topo vermelho de Angostura.",
    "story": "Nascido nos anos 1920 no Queen’s Park Hotel em Port of Spain, Trinidad e Tobago — berço da própria Angostura.",
    "glass": "Copo alto",
    "technique": "Swizzle",
    "garnish": "Buquê de hortelã e camada de Angostura",
    "shaken": false,
    "tags": [
      "Clássico",
      "Herbal / Hortelã",
      "Refrescante",
      "Rum"
    ]
  },
  {
    "name": "Three Dots and a Dash",
    "category": "Tiki & Tropicais",
    "ingredients": [
      {
        "n": "Rum",
        "q": "60 ml (Envelhecido)"
      },
      {
        "n": "Falernum",
        "q": "15 ml"
      },
      {
        "n": "Mel",
        "q": "15 ml"
      },
      {
        "n": "Suco de laranja",
        "q": "15 ml"
      },
      {
        "n": "Limão",
        "q": "15 ml (Taiti)"
      },
      {
        "n": "Angostura",
        "q": "1 dash"
      },
      {
        "n": "Cereja",
        "q": "3 unid"
      },
      {
        "n": "Gelo",
        "q": "triturado"
      }
    ],
    "steps": "1. Bata todos os ingredientes líquidos com muito gelo.\n2. Coe sobre gelo triturado e decore com 3 cerejas e 1 pedaço de abacaxi (código Morse da vitória).",
    "description": "Rum agrícola e envelhecido com mel, falernum e especiarias quentes.",
    "story": "Criado por Donn Beach nos anos 1940: o nome representa a letra “V” de Vitória em código Morse (...-).",
    "glass": "Copo alto / Tiki",
    "technique": "Shaker",
    "garnish": "3 cerejas + 1 tira de abacaxi",
    "shaken": true,
    "tags": [
      "Clássico",
      "Tropical",
      "Forte",
      "Rum"
    ]
  },
  {
    "name": "Canchánchara",
    "category": "Tiki & Tropicais",
    "ingredients": [
      {
        "n": "Rum",
        "q": "60 ml (Branco ou Aguardente)"
      },
      {
        "n": "Mel",
        "q": "20 ml"
      },
      {
        "n": "Limão",
        "q": "20 ml (Taiti)"
      },
      {
        "n": "Gelo",
        "q": "cubos"
      }
    ],
    "steps": "1. Dilua o mel no fundo do copo com o suco de limão e um fio de água.\n2. Adicione gelo e rum e mexa bem.",
    "description": "Ancestral cubano do Daiquiri feito com mel de abelha, limão e rum.",
    "story": "Bebida dos guerreiros mambises durante as guerras de independência de Cuba no século XIX — hoje coquetel oficial da IBA.",
    "glass": "Copo baixo",
    "technique": "Mexido no copo",
    "garnish": "Rodela de limão",
    "shaken": false,
    "tags": [
      "Clássico",
      "Cítrico / Ácido",
      "Rum"
    ]
  },
  {
    "name": "Ti' Punch",
    "category": "Tiki & Tropicais",
    "ingredients": [
      {
        "n": "Rum",
        "q": "50 ml (Agrícola ou Cachaça)"
      },
      {
        "n": "Xarope de açúcar",
        "q": "10 ml"
      },
      {
        "n": "Limão",
        "q": "1 moeda de casca com polpa (Taiti)"
      }
    ],
    "steps": "1. Esprema a moeda de limão no copo baixo com xarope de cana.\n2. Adicione o rum e mexa (tradicionalmente com pouco ou nenhum gelo).",
    "description": "Puro, direto e aromático: o drink nacional das Antilhas Francesas.",
    "story": "Na Martinica e Guadalupe o ritual é “Chacun prépare sa propre mort” — cada convidado ajusta o próprio equilíbrio de cana e limão.",
    "glass": "Copo baixo",
    "technique": "Montado no copo",
    "garnish": "Moeda de limão",
    "shaken": false,
    "tags": [
      "Clássico",
      "Forte",
      "Curto",
      "Rum"
    ]
  },
  {
    "name": "El Presidente",
    "category": "Tiki & Tropicais",
    "ingredients": [
      {
        "n": "Rum",
        "q": "45 ml (Branco ou Dourado)"
      },
      {
        "n": "Vermute",
        "q": "25 ml (Branco/Seco)"
      },
      {
        "n": "Cointreau",
        "q": "15 ml"
      },
      {
        "n": "Grenadine",
        "q": "5 ml"
      },
      {
        "n": "Laranja",
        "q": "1 casca"
      },
      {
        "n": "Gelo",
        "q": "para mexer"
      }
    ],
    "steps": "1. Mexa todos os ingredientes em mixing glass com gelo por 25 segundos.\n2. Coe para taça coupe gelada e perfume com casca de laranja.",
    "description": "O Manhattan aristocrático de Havana: rum, vermute, laranja e toque rubi de grenadine.",
    "story": "Criado em Havana nos anos 1910-20 em homenagem ao presidente cubano Mario García Menocal.",
    "glass": "Taça Coupe",
    "technique": "Mexido",
    "garnish": "Casca de laranja e cereja",
    "shaken": false,
    "tags": [
      "Clássico",
      "Forte",
      "Curto",
      "Rum"
    ]
  },
  {
    "name": "Mary Pickford",
    "category": "Tiki & Tropicais",
    "ingredients": [
      {
        "n": "Rum",
        "q": "50 ml (Branco)"
      },
      {
        "n": "Suco de abacaxi",
        "q": "45 ml"
      },
      {
        "n": "Maraschino",
        "q": "7 ml"
      },
      {
        "n": "Grenadine",
        "q": "7 ml"
      },
      {
        "n": "Cereja",
        "q": "1 unid"
      },
      {
        "n": "Gelo",
        "q": "para bater"
      }
    ],
    "steps": "1. Bata rum branco, suco de abacaxi fresco, Maraschino e grenadine com gelo.\n2. Coe para taça coupe gelada.",
    "description": "Rosado delicado de rum branco, abacaxi e cereja maraschino.",
    "story": "Criado em Havana nos anos 1920 para a estrela do cinema mudo Mary Pickford durante filmagens em Cuba.",
    "glass": "Taça Coupe",
    "technique": "Shaker",
    "garnish": "Cereja",
    "shaken": true,
    "tags": [
      "Clássico",
      "Tropical",
      "Frutado",
      "Rum"
    ]
  },
  {
    "name": "Hotel Nacional Special",
    "category": "Tiki & Tropicais",
    "ingredients": [
      {
        "n": "Rum",
        "q": "45 ml (Dourado)"
      },
      {
        "n": "Apricot Brandy",
        "q": "15 ml"
      },
      {
        "n": "Suco de abacaxi",
        "q": "30 ml"
      },
      {
        "n": "Limão",
        "q": "15 ml (Taiti)"
      },
      {
        "n": "Xarope de açúcar",
        "q": "10 ml"
      },
      {
        "n": "Gelo",
        "q": "para bater"
      }
    ],
    "steps": "1. Bata rum, licor de damasco, suco de abacaxi, limão e xarope com gelo.\n2. Coe para taça coupe gelada.",
    "description": "Rum cubano dourado com notas frutadas de damasco, abacaxi e limão.",
    "story": "Clássico da era dourada do lendário Hotel Nacional de Cuba em 1930, assinado por Wil Taylor.",
    "glass": "Taça Coupe",
    "technique": "Shaker",
    "garnish": "Fatia de abacaxi ou limão",
    "shaken": true,
    "tags": [
      "Clássico",
      "Tropical",
      "Frutado",
      "Rum"
    ]
  },
  {
    "name": "Pineapple Express",
    "category": "Tiki & Tropicais",
    "ingredients": [
      {
        "n": "Rum",
        "q": "50 ml (Branco)"
      },
      {
        "n": "Abacaxi",
        "q": "70 g"
      },
      {
        "n": "Xarope de gengibre",
        "q": "15 ml"
      },
      {
        "n": "Limão",
        "q": "20 ml (Taiti)"
      },
      {
        "n": "Hortelã",
        "q": "6 folhas"
      },
      {
        "n": "Gelo",
        "q": "para bater"
      }
    ],
    "steps": "1. Macere o abacaxi com a hortelã no fundo do shaker.\n2. Adicione rum, gengibre e limão e bata forte com gelo.\n3. Coe sobre gelo novo.",
    "description": "Abacaxi fresco macerado com rum, gengibre picante e hortelã.",
    "story": "Queridinho de bares tropicais modernos por unir frutas frescas de feira ao vigor picante do gengibre.",
    "glass": "Copo baixo / Tiki",
    "technique": "Macerado + shaker",
    "garnish": "Folha de abacaxi e hortelã",
    "shaken": true,
    "tags": [
      "Tropical",
      "Picante / Gengibre",
      "Refrescante",
      "Rum"
    ]
  },
  {
    "name": "Vulcão de Maracujá",
    "category": "Tiki & Tropicais",
    "ingredients": [
      {
        "n": "Rum",
        "q": "40 ml (Branco)"
      },
      {
        "n": "Cachaça",
        "q": "20 ml (Ouro)"
      },
      {
        "n": "Maracujá",
        "q": "1 fruta"
      },
      {
        "n": "Limão",
        "q": "20 ml (Taiti)"
      },
      {
        "n": "Xarope de açúcar",
        "q": "15 ml"
      },
      {
        "n": "Gelo",
        "q": "triturado"
      }
    ],
    "steps": "1. Bata rum, cachaça ouro, polpa de maracujá, limão e xarope com gelo.\n2. Coe sobre gelo triturado em copo tiki e decore com casca de limão.",
    "description": "Casamento potente de rum e cachaça ouro em erupção de maracujá.",
    "story": "Criação tropical brasileira inspirada nos rituais Tiki de fogo e frutas ácidas da casa.",
    "glass": "Copo Tiki / Baixo",
    "technique": "Shaker",
    "garnish": "Casca de limão e maracujá",
    "shaken": true,
    "tags": [
      "Autoral",
      "Tropical",
      "Forte",
      "Rum",
      "Cachaça"
    ]
  },
  {
    "name": "Zumbi Carioca",
    "category": "Tiki & Tropicais",
    "ingredients": [
      {
        "n": "Rum",
        "q": "30 ml (Branco)"
      },
      {
        "n": "Cachaça",
        "q": "20 ml (Ouro)"
      },
      {
        "n": "Conhaque",
        "q": "20 ml"
      },
      {
        "n": "Abacaxi",
        "q": "50 g"
      },
      {
        "n": "Xarope de groselha",
        "q": "15 ml"
      },
      {
        "n": "Limão",
        "q": "20 ml (Taiti)"
      },
      {
        "n": "Hortelã",
        "q": "6 folhas"
      },
      {
        "n": "Canela",
        "q": "1 pitada"
      },
      {
        "n": "Gelo",
        "q": "triturado"
      }
    ],
    "steps": "1. Macere o abacaxi na coqueteleira.\n2. Adicione rum, cachaça, conhaque, groselha e limão e bata com gelo.\n3. Coe sobre gelo triturado e finalize com hortelã e canela.",
    "description": "Três destilados em versão brasileira do clássico Zombie, frutado e especiado.",
    "story": "Releitura tropical de alma carioca que substitui ingredientes raros por cachaça ouro, conhaque e abacaxi fresco.",
    "glass": "Copo Tiki / Alto",
    "technique": "Macerado + shaker",
    "garnish": "Hortelã e pitada de canela",
    "shaken": true,
    "tags": [
      "Autoral",
      "Brasileiro",
      "Tropical",
      "Forte",
      "Rum",
      "Cachaça"
    ]
  },
  {
    "name": "Naufrágio",
    "category": "Tiki & Tropicais",
    "ingredients": [
      {
        "n": "Rum",
        "q": "50 ml (Branco)"
      },
      {
        "n": "Abacaxi",
        "q": "70 g"
      },
      {
        "n": "Xarope de groselha",
        "q": "15 ml"
      },
      {
        "n": "Limão",
        "q": "20 ml (Taiti)"
      },
      {
        "n": "Xarope de açúcar",
        "q": "15 ml"
      },
      {
        "n": "Gelo",
        "q": "triturado"
      }
    ],
    "steps": "1. Macere o abacaxi no shaker.\n2. Adicione rum, groselha, limão e xarope e bata com gelo.\n3. Sirva sobre gelo triturado.",
    "description": "Abacaxi tropical tingido de rubi com groselha e rum sobre gelo picado.",
    "story": "Criado para ter visual de pôr do sol em alto-mar usando ingredientes diretos do balcão brasileiro.",
    "glass": "Copo Tiki / Baixo",
    "technique": "Shaker",
    "garnish": "Folha de abacaxi",
    "shaken": true,
    "tags": [
      "Autoral",
      "Tropical",
      "Frutado",
      "Rum"
    ]
  },
  {
    "name": "Pirata do Abacaxi",
    "category": "Tiki & Tropicais",
    "ingredients": [
      {
        "n": "Rum",
        "q": "50 ml (Branco)"
      },
      {
        "n": "Abacaxi",
        "q": "80 g (grelhado ou fresco)"
      },
      {
        "n": "Xarope de açúcar",
        "q": "15 ml"
      },
      {
        "n": "Limão",
        "q": "15 ml (Taiti)"
      },
      {
        "n": "Gelo",
        "q": "cubos"
      }
    ],
    "steps": "1. Doure rapidamente o abacaxi (ou macere fresco) no fundo do shaker.\n2. Adicione rum, xarope e limão, bata forte com gelo e coe sobre cubo grande.",
    "description": "Doçura caramelizada do abacaxi com rum branco e toque de limão.",
    "story": "Receita tiki enxuta que extrai o máximo sabor da fruta caramelizada na coqueteleira.",
    "glass": "Copo baixo",
    "technique": "Macerado + shaker",
    "garnish": "Fatia de abacaxi grelhado",
    "shaken": true,
    "tags": [
      "Autoral",
      "Tropical",
      "Frutado",
      "Rum"
    ]
  },
  {
    "name": "Hurricane Rosa",
    "category": "Tiki & Tropicais",
    "ingredients": [
      {
        "n": "Rum",
        "q": "45 ml (Branco)"
      },
      {
        "n": "Maracujá",
        "q": "1 fruta"
      },
      {
        "n": "Limão",
        "q": "20 ml (Taiti)"
      },
      {
        "n": "Xarope de groselha",
        "q": "20 ml"
      },
      {
        "n": "Gelo",
        "q": "cubos"
      }
    ],
    "steps": "1. Bata rum, polpa de maracujá, limão e xarope de groselha com bastante gelo.\n2. Coe em taça hurricane com gelo novo.",
    "description": "Versão rosada e vibrante do clássico de Nova Orleans com maracujá fresco.",
    "story": "Adaptação tropical com cor intensa e acidez envolvente pronta para o estoque de casa.",
    "glass": "Taça Hurricane",
    "technique": "Shaker",
    "garnish": "Cereja e casca de maracujá",
    "shaken": true,
    "tags": [
      "Autoral",
      "Tropical",
      "Doce",
      "Frutado",
      "Rum"
    ]
  },
  {
    "name": "Scorpion",
    "category": "Tiki & Tropicais",
    "ingredients": [
      {
        "n": "Rum",
        "q": "45 ml (Branco)"
      },
      {
        "n": "Conhaque",
        "q": "20 ml"
      },
      {
        "n": "Suco de laranja",
        "q": "50 ml"
      },
      {
        "n": "Limão",
        "q": "25 ml (Taiti)"
      },
      {
        "n": "Orgeat",
        "q": "15 ml"
      },
      {
        "n": "Gelo",
        "q": "triturado"
      }
    ],
    "steps": "1. Bata rum, conhaque, sucos de laranja e limão e orgeat com muito gelo.\n2. Coe para copo alto cheio de gelo picado.",
    "description": "Clássico tiki de Trader Vic com rum, conhaque, laranja e amêndoa orgeat.",
    "story": "Nascido no Havaí nos anos 1940 e famoso tanto em doses individuais quanto em grandes tigelas compartilhadas.",
    "glass": "Copo alto / Tiki",
    "technique": "Shaker",
    "garnish": "Hortelã e flor ou rodela de laranja",
    "shaken": true,
    "tags": [
      "Clássico",
      "Tropical",
      "Forte",
      "Rum",
      "Conhaque"
    ]
  },
  {
    "name": "Paloma",
    "category": "Cítricos",
    "ingredients": [
      {
        "n": "Tequila",
        "q": "50 ml (Prata ou Reposado)"
      },
      {
        "n": "Suco de grapefruit",
        "q": "90 ml"
      },
      {
        "n": "Limão",
        "q": "15 ml (Taiti)"
      },
      {
        "n": "Água com gás",
        "q": "45 ml"
      },
      {
        "n": "Sal",
        "q": "na borda"
      },
      {
        "n": "Gelo",
        "q": "cubos"
      }
    ],
    "steps": "1. Passe sal em meia borda de um copo alto e encha com gelo.\n2. Despeje tequila, suco de grapefruit e limão.\n3. Complete com água com gás e mexa uma vez.",
    "description": "Mais popular no México que a Margarita: tequila, toranja e borda de sal.",
    "story": "Nascida em Jalisco por volta dos anos 1950 e atribuída ao lendário Don Javier Delgado Corona no bar La Capilla em Tequila.",
    "glass": "Copo alto",
    "technique": "Montado no copo",
    "garnish": "Borda de sal e gomo de grapefruit",
    "shaken": false,
    "tags": [
      "Clássico",
      "Cítrico / Ácido",
      "Refrescante",
      "Longo",
      "Tequila"
    ]
  },
  {
    "name": "El Diablo",
    "category": "Cítricos",
    "ingredients": [
      {
        "n": "Tequila",
        "q": "45 ml (Reposado)"
      },
      {
        "n": "Licor de cassis",
        "q": "15 ml"
      },
      {
        "n": "Limão",
        "q": "20 ml (Taiti)"
      },
      {
        "n": "Ginger beer",
        "q": "90 ml"
      },
      {
        "n": "Gelo",
        "q": "cubos"
      }
    ],
    "steps": "1. Bata tequila, licor de cassis e limão com gelo.\n2. Coe em copo alto com gelo fresco e complete com ginger beer.",
    "description": "Tequila reposado com cassis rubi, limão e picância de ginger beer.",
    "story": "Registrado por Trader Vic em 1946 no Book of Food and Drink como “Mexican El Diablo”, um casamento surpreendente de agave e cassis.",
    "glass": "Copo alto",
    "technique": "Shaker + build",
    "garnish": "Amora ou gomo de limão",
    "shaken": true,
    "tags": [
      "Clássico",
      "Picante / Gengibre",
      "Frutado",
      "Tequila"
    ]
  },
  {
    "name": "Mexican Mule",
    "category": "Refrescantes",
    "ingredients": [
      {
        "n": "Tequila",
        "q": "50 ml (Prata)"
      },
      {
        "n": "Xarope de gengibre",
        "q": "20 ml"
      },
      {
        "n": "Limão",
        "q": "20 ml (Taiti)"
      },
      {
        "n": "Água com gás",
        "q": "90 ml"
      },
      {
        "n": "Gelo",
        "q": "cubos"
      }
    ],
    "steps": "1. Encha a caneca ou copo alto com gelo.\n2. Despeje tequila, limão e xarope de gengibre e complete com água com gás.",
    "description": "O Moscow Mule trocando a vodka pela energia terrosa da tequila.",
    "story": "Adaptação contemporânea presente em quase todo bar mexicano moderno pela combinação natural entre agave e gengibre.",
    "glass": "Caneca de cobre",
    "technique": "Montado na caneca",
    "garnish": "Rodela de limão e hortelã",
    "shaken": false,
    "tags": [
      "Clássico",
      "Picante / Gengibre",
      "Refrescante",
      "Tequila"
    ]
  },
  {
    "name": "Oaxaca Old Fashioned",
    "category": "Fortes",
    "ingredients": [
      {
        "n": "Tequila",
        "q": "45 ml (Reposado)"
      },
      {
        "n": "Mezcal",
        "q": "15 ml"
      },
      {
        "n": "Mel",
        "q": "10 ml (ou agave)"
      },
      {
        "n": "Angostura",
        "q": "2 dashes"
      },
      {
        "n": "Laranja",
        "q": "1 casca"
      },
      {
        "n": "Gelo",
        "q": "1 cubo grande"
      }
    ],
    "steps": "1. Mexa tequila reposado, mezcal espadín, mel de agave e Angostura com gelo.\n2. Coe sobre pedra grande de gelo e perfume com casca de laranja.",
    "description": "Old Fashioned defumado unindo tequila reposado e mezcal artesanal.",
    "story": "Criado por Phil Ward em 2007 no Death & Co de Nova York — o drink que apresentou o mezcal à coquetelaria mundial.",
    "glass": "Old fashioned",
    "technique": "Mexido",
    "garnish": "Casca de laranja flambada",
    "shaken": false,
    "tags": [
      "Clássico",
      "Forte",
      "Curto",
      "Tequila"
    ]
  },
  {
    "name": "Naked and Famous",
    "category": "Cítricos",
    "ingredients": [
      {
        "n": "Mezcal",
        "q": "22 ml"
      },
      {
        "n": "Chartreuse",
        "q": "22 ml (Amarelo)"
      },
      {
        "n": "Aperol",
        "q": "22 ml"
      },
      {
        "n": "Limão",
        "q": "22 ml (Taiti)"
      },
      {
        "n": "Gelo",
        "q": "para bater"
      }
    ],
    "steps": "1. Bata os quatro ingredientes em partes iguais com bastante gelo.\n2. Coe duas vezes para taça coupe gelada.",
    "description": "Fumaça de mezcal, ervas do Chartreuse amarelo, Aperol e limão em partes iguais.",
    "story": "Criado por Joaquín Simó em 2011 no Death & Co como filho direto do Paper Plane e do Last Word.",
    "glass": "Taça Coupe",
    "technique": "Shaker",
    "garnish": "Sem guarnição ou casca de limão",
    "shaken": true,
    "tags": [
      "Clássico",
      "Amargo",
      "Cítrico / Ácido",
      "Forte"
    ]
  },
  {
    "name": "Division Bell",
    "category": "Cítricos",
    "ingredients": [
      {
        "n": "Mezcal",
        "q": "30 ml"
      },
      {
        "n": "Aperol",
        "q": "22 ml"
      },
      {
        "n": "Maraschino",
        "q": "15 ml"
      },
      {
        "n": "Limão",
        "q": "22 ml (Taiti)"
      },
      {
        "n": "Gelo",
        "q": "para bater"
      }
    ],
    "steps": "1. Bata mezcal, Aperol, Maraschino e suco de limão fresco com gelo.\n2. Coe duas vezes para taça coupe gelada e perfume com grapefruit ou limão.",
    "description": "Mezcal defumado abraçado por Aperol e cereja seca de Maraschino.",
    "story": "Criado por Phil Ward no Mayahuel de Nova York por volta de 2009, batizado em homenagem ao álbum do Pink Floyd.",
    "glass": "Taça Coupe",
    "technique": "Shaker",
    "garnish": "Twist de grapefruit ou limão",
    "shaken": true,
    "tags": [
      "Clássico",
      "Amargo",
      "Cítrico / Ácido"
    ]
  },
  {
    "name": "Matador",
    "category": "Cítricos",
    "ingredients": [
      {
        "n": "Tequila",
        "q": "50 ml (Prata)"
      },
      {
        "n": "Suco de abacaxi",
        "q": "60 ml"
      },
      {
        "n": "Limão",
        "q": "20 ml (Taiti)"
      },
      {
        "n": "Gelo",
        "q": "para bater"
      }
    ],
    "steps": "1. Bata tequila, suco de abacaxi e limão fresco vigorosamente com gelo.\n2. Coe para taça coupe ou copo baixo com gelo.",
    "description": "A resposta mexicana ao Daiquiri: tequila, abacaxi fresco e limão.",
    "story": "Registrado em manuais dos anos 1940-50 como um dos clássicos tropicais mais simples e certeiros de tequila.",
    "glass": "Taça Coupe / Copo baixo",
    "technique": "Shaker",
    "garnish": "Fatia de abacaxi ou limão",
    "shaken": true,
    "tags": [
      "Clássico",
      "Tropical",
      "Cítrico / Ácido",
      "Tequila"
    ]
  },
  {
    "name": "Watermelon Margarita",
    "category": "Doces & Frutados",
    "ingredients": [
      {
        "n": "Tequila",
        "q": "50 ml (Prata)"
      },
      {
        "n": "Melancia",
        "q": "100 g (em cubos)"
      },
      {
        "n": "Triple Sec",
        "q": "20 ml"
      },
      {
        "n": "Limão",
        "q": "20 ml (Taiti)"
      },
      {
        "n": "Sal",
        "q": "na borda"
      },
      {
        "n": "Gelo",
        "q": "para bater"
      }
    ],
    "steps": "1. Macere a melancia fresca no fundo da coqueteleira.\n2. Adicione tequila, Triple Sec, limão e gelo e bata forte.\n3. Coe duas vezes no copo baixo com meia borda de sal.",
    "description": "Melancia suculenta macerada com tequila, Triple Sec e contraste de sal.",
    "story": "Clássico moderno de verão que transforma a Margarita em explosão vermelha refrescante.",
    "glass": "Copo baixo / Taça",
    "technique": "Macerado + shaker",
    "garnish": "Triângulo de melancia e borda de sal",
    "shaken": true,
    "tags": [
      "Frutado",
      "Refrescante",
      "Cítrico / Ácido",
      "Tequila"
    ]
  },
  {
    "name": "Pisco Sour",
    "category": "Cítricos",
    "ingredients": [
      {
        "n": "Pisco",
        "q": "60 ml"
      },
      {
        "n": "Limão",
        "q": "25 ml (Taiti)"
      },
      {
        "n": "Xarope de açúcar",
        "q": "20 ml"
      },
      {
        "n": "Clara de ovo",
        "q": "20 ml"
      },
      {
        "n": "Angostura",
        "q": "3 gotas"
      },
      {
        "n": "Gelo",
        "q": "para bater"
      }
    ],
    "steps": "1. Faça dry shake (sem gelo) com Pisco, limão, xarope e clara por 12 segundos.\n2. Adicione bastante gelo, bata vigorosamente e coe duas vezes para copo baixo ou coupe.\n3. Finalize com 3 gotas de Angostura sobre a espuma.",
    "description": "Espuma cremosa andina com destilado de uva Pisco, limão e Angostura.",
    "story": "Criado por Victor Vaughen Morris no Morris’ Bar em Lima por volta de 1920 — patrimônio cultural do Peru.",
    "glass": "Copo baixo / Coupe",
    "technique": "Dry shake + shaker",
    "garnish": "3 gotas de Angostura na espuma",
    "shaken": true,
    "tags": [
      "Clássico",
      "Cítrico / Ácido",
      "Cremoso"
    ]
  },
  {
    "name": "Chilcano",
    "category": "Refrescantes",
    "ingredients": [
      {
        "n": "Pisco",
        "q": "50 ml"
      },
      {
        "n": "Ginger ale",
        "q": "120 ml"
      },
      {
        "n": "Limão",
        "q": "20 ml (Taiti)"
      },
      {
        "n": "Angostura",
        "q": "2 dashes"
      },
      {
        "n": "Gelo",
        "q": "cubos"
      }
    ],
    "steps": "1. Encha um copo alto com gelo.\n2. Despeje Pisco, suco de limão fresco e complete com ginger ale.\n3. Finalize com dashes de Angostura.",
    "description": "Highball peruano leve e efervescente de Pisco, gengibre e limão.",
    "story": "Tão popular nas noites de Lima quanto o próprio Pisco Sour pela leveza refrescante de festa.",
    "glass": "Copo alto",
    "technique": "Montado no copo",
    "garnish": "Rodela de limão",
    "shaken": false,
    "tags": [
      "Clássico",
      "Refrescante",
      "Picante / Gengibre",
      "Longo"
    ]
  },
  {
    "name": "Pisco Punch",
    "category": "Tiki & Tropicais",
    "ingredients": [
      {
        "n": "Pisco",
        "q": "60 ml"
      },
      {
        "n": "Suco de abacaxi",
        "q": "35 ml"
      },
      {
        "n": "Limão",
        "q": "20 ml (Taiti)"
      },
      {
        "n": "Xarope de açúcar",
        "q": "20 ml"
      },
      {
        "n": "Gelo",
        "q": "para bater"
      }
    ],
    "steps": "1. Bata Pisco, suco de abacaxi fresco, limão e xarope com muito gelo.\n2. Coe duas vezes para taça coupe gelada.",
    "description": "Clássico histórico de São Francisco de Pisco com abacaxi e limão.",
    "story": "Criado por Duncan Nicol no Bank Exchange Saloon em São Francisco no século XIX — diziam que tinha o sabor de mil uvas e abacaxis.",
    "glass": "Taça Coupe",
    "technique": "Shaker",
    "garnish": "Pedaço de abacaxi",
    "shaken": true,
    "tags": [
      "Clássico",
      "Tropical",
      "Frutado"
    ]
  },
  {
    "name": "Carajillo 43",
    "category": "Fortes",
    "ingredients": [
      {
        "n": "Licor 43",
        "q": "50 ml"
      },
      {
        "n": "Café espresso",
        "q": "50 ml"
      },
      {
        "n": "Café em grãos",
        "q": "3 grãos"
      },
      {
        "n": "Gelo",
        "q": "cubos"
      }
    ],
    "steps": "1. Bata Licor 43 e café espresso fresco com muito gelo por 12 segundos até criar espuma dourada.\n2. Coe sobre cubo grande de gelo em copo baixo e decore com grãos.",
    "description": "Café espresso batido com baunilha e especiarias espanholas do Licor 43.",
    "story": "Febre nos restaurantes do México e do Brasil nos últimos anos, unindo energia do espresso ao dulçor aromático das 43 botânicas.",
    "glass": "Copo baixo",
    "technique": "Shaker vigoroso",
    "garnish": "3 grãos de café",
    "shaken": true,
    "tags": [
      "Clássico",
      "Cremoso",
      "Doce",
      "Forte"
    ]
  },
  {
    "name": "Espresso Tonic",
    "category": "Refrescantes",
    "ingredients": [
      {
        "n": "Café espresso",
        "q": "45 ml"
      },
      {
        "n": "Água tônica",
        "q": "120 ml"
      },
      {
        "n": "Laranja",
        "q": "1 rodela ou casca"
      },
      {
        "n": "Gelo",
        "q": "cubos"
      }
    ],
    "steps": "1. Encha um copo alto com gelo e despeje a água tônica.\n2. Lentamente, despeje o espresso sobre o gelo para formar duas camadas contrastantes.",
    "description": "Camadas visuais de tônica cristalina e espresso recém-extraído com laranja.",
    "story": "Nascido na Suécia em 2007 na Koppi Roasters e adotado por coffee bars e coquetelarias do mundo inteiro.",
    "glass": "Copo alto",
    "technique": "Montado em camadas",
    "garnish": "Rodela de laranja ou limão",
    "shaken": false,
    "tags": [
      "Refrescante",
      "Amargo",
      "Com soda / Tônica",
      "Sem álcool"
    ]
  },
  {
    "name": "Irish Coffee",
    "category": "Fortes",
    "ingredients": [
      {
        "n": "Whisky",
        "q": "45 ml (Irish)"
      },
      {
        "n": "Café espresso",
        "q": "90 ml (quente)"
      },
      {
        "n": "Açúcar",
        "q": "1.5 colher (Mascavo)"
      },
      {
        "n": "Chantilly",
        "q": "30 ml (creme batido leve)"
      }
    ],
    "steps": "1. Aqueça uma taça com água quente e descarte.\n2. Dissolva açúcar mascavo no café quente e adicione o whisky irlandês.\n3. Flutue delicadamente creme fresco batido por cima sem misturar.",
    "description": "Whisky irlandês, café quente adocicado e colarinho frio de creme.",
    "story": "Criado por Joe Sheridan nos anos 1940 no aeroporto de Foynes na Irlanda para aquecer passageiros em noites chuvosas.",
    "glass": "Taça Irish Coffee",
    "technique": "Montado quente + float de creme",
    "garnish": "Camada cremosa branca",
    "shaken": false,
    "tags": [
      "Clássico",
      "Cremoso",
      "Forte",
      "Whisky"
    ]
  },
  {
    "name": "Hot Toddy",
    "category": "Fortes",
    "ingredients": [
      {
        "n": "Whisky",
        "q": "50 ml (Scotch ou Bourbon)"
      },
      {
        "n": "Mel",
        "q": "20 ml"
      },
      {
        "n": "Limão",
        "q": "20 ml (Siciliano)"
      },
      {
        "n": "Canela",
        "q": "1 pau"
      },
      {
        "n": "Cravo-da-índia",
        "q": "3 unid"
      }
    ],
    "steps": "1. Coloque mel, limão siciliano, whisky e especiarias em caneca resistente ao calor.\n2. Complete com 100 ml de água bem quente e mexa com o pau de canela.",
    "description": "Abraço quente de whisky, mel, limão siciliano, cravo e canela.",
    "story": "Receita escocesa tradicional dos séculos XVIII-XIX famosa como conforto aromático em noites frias.",
    "glass": "Caneca / Copo térmico",
    "technique": "Montado quente",
    "garnish": "Rodela de limão espetada com cravos e canela",
    "shaken": false,
    "tags": [
      "Clássico",
      "Forte",
      "Whisky"
    ]
  },
  {
    "name": "Trinidad Sour",
    "category": "Fortes",
    "ingredients": [
      {
        "n": "Angostura",
        "q": "45 ml"
      },
      {
        "n": "Orgeat",
        "q": "30 ml"
      },
      {
        "n": "Limão",
        "q": "22 ml (Siciliano)"
      },
      {
        "n": "Whisky",
        "q": "15 ml (Rye)"
      },
      {
        "n": "Gelo",
        "q": "para bater"
      }
    ],
    "steps": "1. Bata a dose inteira de Angostura com orgeat, limão e whisky com bastante gelo.\n2. Coe duas vezes para taça coupe gelada.",
    "description": "Ousadia histórica: a própria Angostura é a base principal, domada por orgeat.",
    "story": "Criado em 2009 por Giuseppe González em Nova York — desafia tudo o que se pensava sobre bitters na coquetelaria.",
    "glass": "Taça Coupe",
    "technique": "Shaker",
    "garnish": "Sem guarnição",
    "shaken": true,
    "tags": [
      "Clássico",
      "Amargo",
      "Forte",
      "Whisky"
    ]
  },
  {
    "name": "Gin Gin Mule",
    "category": "Refrescantes",
    "ingredients": [
      {
        "n": "Gin",
        "q": "50 ml"
      },
      {
        "n": "Hortelã",
        "q": "10 folhas"
      },
      {
        "n": "Xarope de gengibre",
        "q": "25 ml"
      },
      {
        "n": "Limão",
        "q": "20 ml (Taiti)"
      },
      {
        "n": "Água com gás",
        "q": "60 ml"
      },
      {
        "n": "Gelo",
        "q": "cubos"
      }
    ],
    "steps": "1. Bata gin, hortelã, xarope de gengibre e limão com gelo.\n2. Coe para copo alto com gelo novo e complete com água com gás.",
    "description": "Encontro brilhante do Mojito com o Moscow Mule feito com gin.",
    "story": "Criado por Audrey Saunders em 2000 no Beacon e consagrado no Pegu Club de Nova York como clássico moderno.",
    "glass": "Copo alto / Caneca",
    "technique": "Shaker + build",
    "garnish": "Ramo de hortelã",
    "shaken": true,
    "tags": [
      "Clássico",
      "Refrescante",
      "Herbal / Hortelã",
      "Picante / Gengibre",
      "Gin"
    ]
  },
  {
    "name": "French Martini",
    "category": "Doces & Frutados",
    "ingredients": [
      {
        "n": "Vodka",
        "q": "45 ml"
      },
      {
        "n": "Licor de framboesa",
        "q": "15 ml"
      },
      {
        "n": "Suco de abacaxi",
        "q": "45 ml"
      },
      {
        "n": "Framboesa",
        "q": "1 unid"
      },
      {
        "n": "Gelo",
        "q": "para bater"
      }
    ],
    "steps": "1. Bata vodka, licor de framboesa e suco de abacaxi vigorosamente para criar espuma natural do abacaxi.\n2. Coe duas vezes para taça martini gelada.",
    "description": "Espuma aveludada de abacaxi com licor de framboesa e vodka.",
    "story": "Criado nos anos 1980 em Nova York no Balthazar por Keith McNally e Allen Katz — favorito dos jantares cosmopolitas.",
    "glass": "Taça Martini / Coupe",
    "technique": "Shaker vigoroso",
    "garnish": "Framboesa ou casca de limão",
    "shaken": true,
    "tags": [
      "Clássico",
      "Frutado",
      "Cremoso",
      "Vodka"
    ]
  },
  {
    "name": "Lemon Drop Martini",
    "category": "Cítricos",
    "ingredients": [
      {
        "n": "Vodka",
        "q": "50 ml"
      },
      {
        "n": "Triple Sec",
        "q": "20 ml"
      },
      {
        "n": "Limão",
        "q": "25 ml (Siciliano)"
      },
      {
        "n": "Xarope de açúcar",
        "q": "15 ml"
      },
      {
        "n": "Açúcar",
        "q": "na borda"
      },
      {
        "n": "Gelo",
        "q": "para bater"
      }
    ],
    "steps": "1. Passe limão na borda da taça martini e encoste no açúcar.\n2. Bata vodka, Triple Sec, limão siciliano e xarope com muito gelo e coe duas vezes.",
    "description": "Ácido-doce cristalino de limão siciliano com borda açucarada.",
    "story": "Criado nos anos 1970 em São Francisco por Norman Jay Hobday no Henry Africa’s Bar, inspirado nas balas ácidas de limão.",
    "glass": "Taça Martini",
    "technique": "Shaker",
    "garnish": "Borda de açúcar e espiral de limão",
    "shaken": true,
    "tags": [
      "Clássico",
      "Cítrico / Ácido",
      "Doce",
      "Vodka"
    ]
  },
  {
    "name": "Lychee Martini",
    "category": "Doces & Frutados",
    "ingredients": [
      {
        "n": "Vodka",
        "q": "50 ml"
      },
      {
        "n": "Licor de lichia",
        "q": "25 ml"
      },
      {
        "n": "Vermute",
        "q": "10 ml (Seco)"
      },
      {
        "n": "Lichia",
        "q": "1 fruta"
      },
      {
        "n": "Gelo",
        "q": "para bater"
      }
    ],
    "steps": "1. Bata vodka, licor de lichia e vermute seco com muito gelo.\n2. Coe para taça martini gelada e sirva com uma lichia no palito.",
    "description": "Perfume floral exótico da lichia em taça martini geladíssima.",
    "story": "Ícone dos bares modernos asiático-contemporâneos pela elegância perfumada e leve.",
    "glass": "Taça Martini",
    "technique": "Shaker",
    "garnish": "Lichia no palito",
    "shaken": true,
    "tags": [
      "Frutado",
      "Doce",
      "Vodka"
    ]
  },
  {
    "name": "Appletini",
    "category": "Doces & Frutados",
    "ingredients": [
      {
        "n": "Vodka",
        "q": "45 ml"
      },
      {
        "n": "Xarope de maçã verde",
        "q": "25 ml"
      },
      {
        "n": "Triple Sec",
        "q": "15 ml"
      },
      {
        "n": "Limão",
        "q": "15 ml (Siciliano)"
      },
      {
        "n": "Maçã",
        "q": "1 fatia fina"
      },
      {
        "n": "Gelo",
        "q": "para bater"
      }
    ],
    "steps": "1. Bata vodka, xarope de maçã verde, Triple Sec e limão siciliano com muito gelo.\n2. Coe duas vezes na taça martini e decore com leque fino de maçã.",
    "description": "Verde esmeralda vibrante, ácido e crocante de maçã verde.",
    "story": "Criado em 1996 em West Hollywood no Lola’s Restaurant — o drink verde mais famoso do cinema e da TV.",
    "glass": "Taça Martini",
    "technique": "Shaker",
    "garnish": "Fatia fina de maçã verde",
    "shaken": true,
    "tags": [
      "Clássico",
      "Frutado",
      "Cítrico / Ácido",
      "Vodka"
    ]
  },
  {
    "name": "Midori Sour",
    "category": "Cítricos",
    "ingredients": [
      {
        "n": "Licor de melão",
        "q": "45 ml"
      },
      {
        "n": "Limão",
        "q": "25 ml (Siciliano)"
      },
      {
        "n": "Xarope de açúcar",
        "q": "10 ml"
      },
      {
        "n": "Água com gás",
        "q": "45 ml"
      },
      {
        "n": "Gelo",
        "q": "cubos"
      }
    ],
    "steps": "1. Bata licor de melão, limão siciliano e xarope com gelo.\n2. Coe para copo baixo com gelo novo e finalize com splash de água com gás.",
    "description": "Verde neon de melão doce equilibrado por acidez intensa de limão.",
    "story": "Explodiu nos anos 1980 nos Estados Unidos e Japão logo após o lançamento do licor japonês Midori na festa do Studio 54.",
    "glass": "Copo baixo / Alto",
    "technique": "Shaker + splash",
    "garnish": "Cereja e rodela de limão",
    "shaken": true,
    "tags": [
      "Clássico",
      "Frutado",
      "Doce",
      "Cítrico / Ácido"
    ]
  },
  {
    "name": "Tokyo Iced Tea",
    "category": "Fortes",
    "ingredients": [
      {
        "n": "Vodka",
        "q": "15 ml"
      },
      {
        "n": "Gin",
        "q": "15 ml"
      },
      {
        "n": "Rum",
        "q": "15 ml (Branco)"
      },
      {
        "n": "Tequila",
        "q": "15 ml"
      },
      {
        "n": "Licor de melão",
        "q": "20 ml"
      },
      {
        "n": "Limão",
        "q": "20 ml (Taiti)"
      },
      {
        "n": "Refrigerante de limão",
        "q": "60 ml"
      },
      {
        "n": "Gelo",
        "q": "cubos"
      }
    ],
    "steps": "1. Monte os quatro destilados, licor de melão e limão em copo alto com gelo.\n2. Mexa e complete com refrigerante de limão.",
    "description": "Versão verde esmeralda do Long Island substituindo Triple Sec e cola por melão e soda.",
    "story": "Clássico festivo dos anos 1990 adorado pelo visual fluorescente e perfil frutado.",
    "glass": "Copo alto",
    "technique": "Montado + mexido",
    "garnish": "Rodela de limão e cereja",
    "shaken": false,
    "tags": [
      "Forte",
      "Longo",
      "Doce"
    ]
  },
  {
    "name": "Japanese Slipper",
    "category": "Cítricos",
    "ingredients": [
      {
        "n": "Licor de melão",
        "q": "30 ml"
      },
      {
        "n": "Cointreau",
        "q": "30 ml"
      },
      {
        "n": "Limão",
        "q": "30 ml (Siciliano)"
      },
      {
        "n": "Cereja",
        "q": "1 unid"
      },
      {
        "n": "Gelo",
        "q": "para bater"
      }
    ],
    "steps": "1. Bata partes iguais de licor de melão, Cointreau e limão siciliano com gelo.\n2. Coe para taça coupe gelada com uma cereja ao centro.",
    "description": "Partes iguais de melão vibrante, laranja e limão siciliano.",
    "story": "Criado em 1984 em Melbourne por Jean-Paul Bourguignon no Mietta’s Restaurant — o primeiro clássico moderno australiano.",
    "glass": "Taça Coupe / Martini",
    "technique": "Shaker",
    "garnish": "Cereja ao marasquino",
    "shaken": true,
    "tags": [
      "Clássico",
      "Cítrico / Ácido",
      "Frutado"
    ]
  },
  {
    "name": "Jack Rose",
    "category": "Cítricos",
    "ingredients": [
      {
        "n": "Calvados",
        "q": "50 ml"
      },
      {
        "n": "Limão",
        "q": "20 ml (Taiti)"
      },
      {
        "n": "Grenadine",
        "q": "15 ml"
      },
      {
        "n": "Gelo",
        "q": "para bater"
      }
    ],
    "steps": "1. Bata Calvados, suco de limão e grenadine com bastante gelo.\n2. Coe duas vezes para taça coupe gelada.",
    "description": "Destilado de maçã com romã grenadine e limão em tom rubi clássico.",
    "story": "Famoso nos anos 1920 em Paris e citado por Ernest Hemingway em O Sol Também Se Levanta.",
    "glass": "Taça Coupe",
    "technique": "Shaker",
    "garnish": "Casca de limão",
    "shaken": true,
    "tags": [
      "Clássico",
      "Cítrico / Ácido",
      "Frutado"
    ]
  },
  {
    "name": "Angel Face",
    "category": "Fortes",
    "ingredients": [
      {
        "n": "Gin",
        "q": "30 ml"
      },
      {
        "n": "Apricot Brandy",
        "q": "30 ml"
      },
      {
        "n": "Calvados",
        "q": "30 ml"
      },
      {
        "n": "Gelo",
        "q": "para bater"
      }
    ],
    "steps": "1. Bata partes iguais de gin, licor de damasco e Calvados com gelo.\n2. Coe para taça coupe gelada.",
    "description": "Clássico da Lei Seca em partes iguais: gin, damasco e maçã destilada.",
    "story": "Publicado no Savoy Cocktail Book de 1930 e batizado em referência a um célebre gângster da época.",
    "glass": "Taça Coupe",
    "technique": "Shaker",
    "garnish": "Fatia fina de maçã",
    "shaken": true,
    "tags": [
      "Clássico",
      "Forte",
      "Curto",
      "Gin"
    ]
  },
  {
    "name": "Pegu Club",
    "category": "Cítricos",
    "ingredients": [
      {
        "n": "Gin",
        "q": "60 ml"
      },
      {
        "n": "Cointreau",
        "q": "20 ml"
      },
      {
        "n": "Limão",
        "q": "20 ml (Taiti)"
      },
      {
        "n": "Angostura",
        "q": "1 dash"
      },
      {
        "n": "Bitter de laranja",
        "q": "1 dash"
      },
      {
        "n": "Gelo",
        "q": "para bater"
      }
    ],
    "steps": "1. Bata gin, Cointreau, limão e os dois bitters com bastante gelo.\n2. Coe duas vezes para taça coupe gelada.",
    "description": "Gin seco, laranja, limão e dupla camada aromática de bitters.",
    "story": "Drink assinatura do clube britânico homônimo em Yangon, Mianmar, na década de 1920.",
    "glass": "Taça Coupe",
    "technique": "Shaker",
    "garnish": "Roda ou casca de limão",
    "shaken": true,
    "tags": [
      "Clássico",
      "Cítrico / Ácido",
      "Forte",
      "Gin"
    ]
  },
  {
    "name": "Casino",
    "category": "Cítricos",
    "ingredients": [
      {
        "n": "Gin",
        "q": "45 ml"
      },
      {
        "n": "Maraschino",
        "q": "10 ml"
      },
      {
        "n": "Limão",
        "q": "15 ml (Siciliano)"
      },
      {
        "n": "Bitter de laranja",
        "q": "2 dashes"
      },
      {
        "n": "Cereja",
        "q": "1 unid"
      },
      {
        "n": "Gelo",
        "q": "para bater"
      }
    ],
    "steps": "1. Bata gin, Maraschino, limão siciliano e bitter de laranja com gelo.\n2. Coe para taça coupe gelada e finalize com cereja.",
    "description": "Irmão mais seco e cristalino do Aviation sem violeta.",
    "story": "Registrado em 1909 no manual de Hugo Ensslin em Nova York — patrimônio oficial da lista Unforgettables da IBA.",
    "glass": "Taça Coupe",
    "technique": "Shaker",
    "garnish": "Cereja e casca de limão",
    "shaken": true,
    "tags": [
      "Clássico",
      "Cítrico / Ácido",
      "Curto",
      "Gin"
    ]
  },
  {
    "name": "Enzoni",
    "category": "Aperitivos",
    "ingredients": [
      {
        "n": "Gin",
        "q": "30 ml"
      },
      {
        "n": "Campari",
        "q": "30 ml"
      },
      {
        "n": "Uva",
        "q": "5 bagos (verdes sem semente)"
      },
      {
        "n": "Limão",
        "q": "20 ml (Siciliano)"
      },
      {
        "n": "Xarope de açúcar",
        "q": "15 ml"
      },
      {
        "n": "Gelo",
        "q": "cubos"
      }
    ],
    "steps": "1. Macere as uvas verdes no fundo da coqueteleira.\n2. Adicione gin, Campari, limão siciliano e xarope e bata com gelo.\n3. Coe sobre gelo em copo baixo.",
    "description": "Encontro mágico entre Negroni e Sour com uvas verdes frescas maceradas.",
    "story": "Criado por Vincenzo Errico no Milk & Honey em Nova York em 2002 — surpreende até quem acha que não gosta de Campari.",
    "glass": "Copo baixo",
    "technique": "Macerado + shaker",
    "garnish": "Espeto com uvas verdes",
    "shaken": true,
    "tags": [
      "Amargo",
      "Frutado",
      "Refrescante",
      "Gin"
    ]
  },
  {
    "name": "Jasmine",
    "category": "Cítricos",
    "ingredients": [
      {
        "n": "Gin",
        "q": "45 ml"
      },
      {
        "n": "Campari",
        "q": "10 ml"
      },
      {
        "n": "Cointreau",
        "q": "10 ml"
      },
      {
        "n": "Limão",
        "q": "20 ml (Siciliano)"
      },
      {
        "n": "Gelo",
        "q": "para bater"
      }
    ],
    "steps": "1. Bata gin, Campari, Cointreau e limão siciliano com muito gelo.\n2. Coe para taça coupe gelada — a cor fica igual à de toranja rosa.",
    "description": "Amargor cítrico brilhante que lembra grapefruit rosa sem levar uma gota da fruta.",
    "story": "Criado por Paul Harrington nos anos 1990 em Berkeley no Townhouse Bar & Grill.",
    "glass": "Taça Coupe",
    "technique": "Shaker",
    "garnish": "Casca de limão siciliano",
    "shaken": true,
    "tags": [
      "Clássico",
      "Amargo",
      "Cítrico / Ácido",
      "Gin"
    ]
  },
  {
    "name": "Kentucky Buck",
    "category": "Refrescantes",
    "ingredients": [
      {
        "n": "Whisky",
        "q": "50 ml (Bourbon)"
      },
      {
        "n": "Morango",
        "q": "2 unid"
      },
      {
        "n": "Limão",
        "q": "20 ml (Siciliano)"
      },
      {
        "n": "Ginger beer",
        "q": "90 ml"
      },
      {
        "n": "Angostura",
        "q": "2 dashes"
      },
      {
        "n": "Gelo",
        "q": "cubos"
      }
    ],
    "steps": "1. Macere os morangos no fundo do shaker.\n2. Adicione bourbon, limão e Angostura e bata com gelo.\n3. Coe para copo alto com gelo novo e complete com ginger beer.",
    "description": "Bourbon com morangos frescos macerados, limão e gengibre picante.",
    "story": "Criado por Erick Castro em São Francisco nos anos 2010 — prova irresistível de que morango e bourbon nasceram um para o outro.",
    "glass": "Copo alto / Caneca",
    "technique": "Macerado + shaker + build",
    "garnish": "Morango e rodela de limão",
    "shaken": true,
    "tags": [
      "Picante / Gengibre",
      "Frutado",
      "Refrescante",
      "Whisky"
    ]
  },
  {
    "name": "Whiskey Smash",
    "category": "Refrescantes",
    "ingredients": [
      {
        "n": "Whisky",
        "q": "60 ml (Bourbon)"
      },
      {
        "n": "Limão",
        "q": "0.5 unid em gomos (Siciliano)"
      },
      {
        "n": "Hortelã",
        "q": "8 folhas"
      },
      {
        "n": "Xarope de açúcar",
        "q": "20 ml"
      },
      {
        "n": "Gelo",
        "q": "cubos"
      }
    ],
    "steps": "1. Macere os gomos de limão siciliano com xarope e hortelã na coqueteleira.\n2. Adicione bourbon e gelo, bata forte e coe sobre gelo novo no copo baixo.",
    "description": "Mint Julep cítrico e vibrante com gomos de limão siciliano esmagados.",
    "story": "Popularizado por Dale DeGroff nos anos 1990 a partir de receitas americanas do século XIX — porta de entrada perfeita para bourbon.",
    "glass": "Copo baixo",
    "technique": "Macerado + shaker",
    "garnish": "Buquê de hortelã",
    "shaken": true,
    "tags": [
      "Clássico",
      "Refrescante",
      "Herbal / Hortelã",
      "Cítrico / Ácido",
      "Whisky"
    ]
  },
  {
    "name": "Eastside",
    "category": "Refrescantes",
    "ingredients": [
      {
        "n": "Gin",
        "q": "50 ml"
      },
      {
        "n": "Pepino",
        "q": "3 fatias"
      },
      {
        "n": "Hortelã",
        "q": "8 folhas"
      },
      {
        "n": "Limão",
        "q": "20 ml (Taiti)"
      },
      {
        "n": "Xarope de açúcar",
        "q": "20 ml"
      },
      {
        "n": "Gelo",
        "q": "para bater"
      }
    ],
    "steps": "1. Macere suavemente pepino e hortelã com xarope na coqueteleira.\n2. Adicione gin, limão e gelo e bata forte.\n3. Coe duas vezes para taça coupe gelada.",
    "description": "O Southside elevado pelo frescor aquático e verde do pepino.",
    "story": "Clássico moderno do Little Branch em Nova York que conquistou bares autorais no mundo todo.",
    "glass": "Taça Coupe",
    "technique": "Macerado + shaker",
    "garnish": "Fatia fina de pepino e folha de hortelã",
    "shaken": true,
    "tags": [
      "Refrescante",
      "Herbal / Hortelã",
      "Cítrico / Ácido",
      "Gin"
    ]
  },
  {
    "name": "Spicy Fifty",
    "category": "Cítricos",
    "ingredients": [
      {
        "n": "Vodka",
        "q": "50 ml"
      },
      {
        "n": "Licor de flor de sabugueiro",
        "q": "15 ml"
      },
      {
        "n": "Mel",
        "q": "10 ml"
      },
      {
        "n": "Limão",
        "q": "20 ml (Taiti)"
      },
      {
        "n": "Pimenta",
        "q": "2 rodelas finas (dedo-de-moça)"
      },
      {
        "n": "Gelo",
        "q": "para bater"
      }
    ],
    "steps": "1. Macere levemente a pimenta com o mel diluído na coqueteleira.\n2. Adicione vodka, licor de sabugueiro e limão, bata com gelo e coe duas vezes.",
    "description": "Floral de sabugueiro com mel e picância viva de pimenta vermelha.",
    "story": "Criado por Salvatore Calabrese em 2005 para os 50 anos do bar Fifty em Londres — hoje membro oficial da IBA.",
    "glass": "Taça Coupe",
    "technique": "Shaker",
    "garnish": "Pimenta vermelha na borda",
    "shaken": true,
    "tags": [
      "Clássico",
      "Picante / Gengibre",
      "Cítrico / Ácido",
      "Vodka"
    ]
  },
  {
    "name": "Fernet con Coca",
    "category": "Fortes",
    "ingredients": [
      {
        "n": "Fernet",
        "q": "50 ml"
      },
      {
        "n": "Coca-Cola",
        "q": "150 ml"
      },
      {
        "n": "Gelo",
        "q": "cubos"
      }
    ],
    "steps": "1. Encha um copo alto com muito gelo.\n2. Despeje o Fernet e complete devagar com Coca-Cola pela parede para controlar a espuma.",
    "description": "Amargor intenso e mentolado de ervas casado com cola gelada.",
    "story": "Ícone cultural da Argentina (chamado de Fernandito pela IBA) que ganhou os balcões descolados de toda a América do Sul.",
    "glass": "Copo alto",
    "technique": "Montado lentamente",
    "garnish": "Sem guarnição",
    "shaken": false,
    "tags": [
      "Clássico",
      "Amargo",
      "Longo"
    ]
  },
  {
    "name": "Tequila Sunrise",
    "category": "Tiki & Tropicais",
    "ingredients": [
      {
        "n": "Tequila",
        "q": "50 ml"
      },
      {
        "n": "Suco de laranja",
        "q": "120 ml"
      },
      {
        "n": "Grenadine",
        "q": "15 ml"
      },
      {
        "n": "Laranja",
        "q": "1 fatia"
      },
      {
        "n": "Gelo",
        "q": "cubos"
      }
    ],
    "steps": "1. Misture tequila e suco de laranja no copo alto com gelo.\n2. Despeje grenadine devagar pela parede interna para criar o degradê solar.",
    "description": "Degradê solar luminoso de tequila, suco de laranja e grenadine.",
    "story": "Reinventado no Trident Bar em Sausalito nos anos 1970 e eternizado pelas turnês dos Rolling Stones.",
    "glass": "Copo alto",
    "technique": "Montado em camadas",
    "garnish": "Fatia de laranja e cereja",
    "shaken": false,
    "tags": [
      "Clássico",
      "Tropical",
      "Doce",
      "Frutado",
      "Tequila"
    ]
  },
  {
    "name": "Sex on the Beach",
    "category": "Doces & Frutados",
    "ingredients": [
      {
        "n": "Vodka",
        "q": "45 ml"
      },
      {
        "n": "Licor de pêssego",
        "q": "20 ml"
      },
      {
        "n": "Suco de laranja",
        "q": "80 ml"
      },
      {
        "n": "Suco de cranberry",
        "q": "40 ml"
      },
      {
        "n": "Gelo",
        "q": "cubos"
      }
    ],
    "steps": "1. Encha um copo alto com gelo.\n2. Adicione vodka, licor de pêssego e suco de laranja.\n3. Finalize com suco de cranberry no topo.",
    "description": "Frutado, doce e vibrante de vodka, pêssego, laranja e cranberry.",
    "story": "Nascido em 1987 em Fort Lauderdale na Flórida durante um concurso nacional de vendas de licor de pêssego.",
    "glass": "Copo alto",
    "technique": "Montado no copo",
    "garnish": "Rodela de laranja e cereja",
    "shaken": false,
    "tags": [
      "Clássico",
      "Frutado",
      "Doce",
      "Longo",
      "Vodka"
    ]
  },
  {
    "name": "Sea Breeze",
    "category": "Refrescantes",
    "ingredients": [
      {
        "n": "Vodka",
        "q": "45 ml"
      },
      {
        "n": "Suco de cranberry",
        "q": "90 ml"
      },
      {
        "n": "Suco de grapefruit",
        "q": "30 ml"
      },
      {
        "n": "Limão",
        "q": "1 gomo"
      },
      {
        "n": "Gelo",
        "q": "cubos"
      }
    ],
    "steps": "1. Encha um copo alto com gelo.\n2. Adicione vodka, cranberry e suco de grapefruit e mexa suavemente.",
    "description": "Brisa marinha seca e frutada de vodka, cranberry e toranja.",
    "story": "Clássico da família Breeze desde os anos 1980, adorado pelo equilíbrio leve entre ácido e frutado.",
    "glass": "Copo alto",
    "technique": "Montado no copo",
    "garnish": "Gomo de limão",
    "shaken": false,
    "tags": [
      "Clássico",
      "Refrescante",
      "Frutado",
      "Vodka"
    ]
  },
  {
    "name": "Hortelã Dourada",
    "category": "Autorais",
    "ingredients": [
      {
        "n": "Rum",
        "q": "30 ml (Branco)"
      },
      {
        "n": "Conhaque",
        "q": "20 ml"
      },
      {
        "n": "Abacaxi",
        "q": "50 g"
      },
      {
        "n": "Limão",
        "q": "15 ml (Taiti)"
      },
      {
        "n": "Hortelã",
        "q": "8 folhas"
      },
      {
        "n": "Xarope de hortelã",
        "q": "10 ml"
      },
      {
        "n": "Gelo",
        "q": "cubos"
      }
    ],
    "steps": "1. Macere o abacaxi com hortelã no fundo da coqueteleira.\n2. Adicione rum, conhaque, limão e xarope de hortelã e bata forte com gelo.\n3. Coe duas vezes sobre gelo novo.",
    "description": "Rum e conhaque dão profundidade, enquanto abacaxi e hortelã trazem frescor.",
    "story": "Nascido de um experimento na Campos House que, após ajustes finos, virou o autoral mais pedido da casa.",
    "glass": "Copo baixo",
    "technique": "Macerado + shaker",
    "garnish": "Ramo de hortelã e fatia de abacaxi",
    "shaken": true,
    "tags": [
      "Autoral",
      "Tropical",
      "Herbal / Hortelã",
      "Rum",
      "Conhaque"
    ]
  },
  {
    "name": "Mule do Campos",
    "category": "Autorais",
    "ingredients": [
      {
        "n": "Vodka",
        "q": "50 ml"
      },
      {
        "n": "Xarope de gengibre",
        "q": "25 ml"
      },
      {
        "n": "Limão",
        "q": "15 ml (Taiti)"
      },
      {
        "n": "Água com gás",
        "q": "80 ml"
      },
      {
        "n": "Hortelã",
        "q": "6 folhas"
      },
      {
        "n": "Gelo",
        "q": "cubos"
      }
    ],
    "steps": "1. Bata vodka, xarope de gengibre e limão com gelo.\n2. Coe no copo ou caneca com gelo novo e complete com água com gás.\n3. Finalize com hortelã batida na palma da mão.",
    "description": "Mule da casa batido para máxima maciez, picante de gengibre e hortelã.",
    "story": "Receita assinatura da Campos House que dispensa espuma industrializada apostando em gengibre e hortelã frescos.",
    "glass": "Caneca / Copo alto",
    "technique": "Shaker + build",
    "garnish": "Hortelã e rodela de limão",
    "shaken": true,
    "tags": [
      "Autoral",
      "Picante / Gengibre",
      "Refrescante",
      "Vodka"
    ]
  },
  {
    "name": "Maracujá Smash de Cachaça",
    "category": "Autorais",
    "ingredients": [
      {
        "n": "Cachaça",
        "q": "50 ml (Prata)"
      },
      {
        "n": "Maracujá",
        "q": "1 fruta"
      },
      {
        "n": "Limão",
        "q": "15 ml (Taiti)"
      },
      {
        "n": "Xarope de açúcar",
        "q": "15 ml"
      },
      {
        "n": "Hortelã",
        "q": "6 folhas"
      },
      {
        "n": "Gelo",
        "q": "cubos"
      }
    ],
    "steps": "1. Coloque polpa de maracujá, hortelã e xarope no shaker e pressione de leve.\n2. Adicione cachaça e limão, bata com gelo e coe sobre gelo novo.",
    "description": "Azedinho, tropical e perfumado com hortelã batida junto da cachaça.",
    "story": "Criação de verão da Campos House pensada para destacar a fruta brasileira com acabamento fotogênico.",
    "glass": "Copo baixo",
    "technique": "Macerado + shaker",
    "garnish": "Meia casca de maracujá e hortelã",
    "shaken": true,
    "tags": [
      "Autoral",
      "Brasileiro",
      "Tropical",
      "Cachaça"
    ]
  },
  {
    "name": "Gin Tônica Morango e Gengibre",
    "category": "Refrescantes",
    "ingredients": [
      {
        "n": "Gin",
        "q": "50 ml (London Dry)"
      },
      {
        "n": "Morango",
        "q": "3 unid"
      },
      {
        "n": "Xarope de gengibre",
        "q": "10 ml"
      },
      {
        "n": "Água tônica",
        "q": "120 ml"
      },
      {
        "n": "Gelo",
        "q": "cubos"
      }
    ],
    "steps": "1. Macere levemente 2 morangos com xarope de gengibre no fundo da taça.\n2. Adicione bastante gelo, gin e complete com água tônica.\n3. Decore com o morango fatiado.",
    "description": "Gin tônica rosado de morango com toque picante de gengibre no final.",
    "story": "Uma das variações mais pedidas da casa por unir visual rosado convidativo e calor sutil de gengibre.",
    "glass": "Taça balão",
    "technique": "Macerado leve + build",
    "garnish": "Morango fatiado",
    "shaken": false,
    "tags": [
      "Autoral",
      "Refrescante",
      "Frutado",
      "Com soda / Tônica",
      "Gin"
    ]
  },
  {
    "name": "Caipi Maçã Verde e Gengibre",
    "category": "Brasileiríssimos",
    "ingredients": [
      {
        "n": "Cachaça",
        "q": "50 ml (Prata)"
      },
      {
        "n": "Limão",
        "q": "1 unid (Taiti)"
      },
      {
        "n": "Xarope de maçã verde",
        "q": "20 ml"
      },
      {
        "n": "Gengibre",
        "q": "2 fatias"
      },
      {
        "n": "Gelo",
        "q": "cubos"
      }
    ],
    "steps": "1. Macere limão e gengibre no fundo do copo ou coqueteleira.\n2. Adicione xarope de maçã verde, cachaça e gelo e agite bem.",
    "description": "Caipirinha moderna verde-esmeralda com acidez crocante e toque picante.",
    "story": "Receita autoral brasileira que moderniza a caipirinha com maçã verde aromática e gengibre fresco.",
    "glass": "Copo baixo",
    "technique": "Macerado + shaker",
    "garnish": "Fatia fina de maçã e gengibre",
    "shaken": true,
    "tags": [
      "Autoral",
      "Brasileiro",
      "Picante / Gengibre",
      "Cítrico / Ácido",
      "Cachaça"
    ]
  },
  {
    "name": "Rubi de Morango",
    "category": "Autorais",
    "ingredients": [
      {
        "n": "Vodka",
        "q": "50 ml"
      },
      {
        "n": "Morango",
        "q": "3 unid"
      },
      {
        "n": "Xarope de morango",
        "q": "15 ml"
      },
      {
        "n": "Limão",
        "q": "15 ml (Taiti)"
      },
      {
        "n": "Água tônica",
        "q": "100 ml"
      },
      {
        "n": "Gelo",
        "q": "cubos"
      }
    ],
    "steps": "1. Macere os morangos com xarope de morango e limão.\n2. Adicione gelo, vodka e complete com água tônica gelada.",
    "description": "Vermelho intenso de morangos amassados com vodka e bolhas de tônica.",
    "story": "Pensado na Campos House para quem pede algo doce, leve e refrescante em taça alta.",
    "glass": "Taça balão / Copo alto",
    "technique": "Macerado + build",
    "garnish": "Morango fresco",
    "shaken": false,
    "tags": [
      "Autoral",
      "Frutado",
      "Doce",
      "Com soda / Tônica",
      "Vodka"
    ]
  },
  {
    "name": "Rum Sour de Maçã Verde",
    "category": "Cítricos",
    "ingredients": [
      {
        "n": "Rum",
        "q": "50 ml (Branco)"
      },
      {
        "n": "Xarope de maçã verde",
        "q": "20 ml"
      },
      {
        "n": "Limão",
        "q": "20 ml (Taiti)"
      },
      {
        "n": "Angostura",
        "q": "2 gotas"
      },
      {
        "n": "Gelo",
        "q": "para bater"
      }
    ],
    "steps": "1. Bata rum, xarope de maçã verde e limão vigorosamente com gelo.\n2. Coe sobre gelo novo e pingue 2 gotas de Angostura por cima.",
    "description": "Daiquiri verde vibrante aromatizado com maçã verde e gotas de Angostura.",
    "story": "Variação autoral de Sour que equilibra o frescor cítrico da maçã verde com especiarias do bitter.",
    "glass": "Copo baixo / Coupe",
    "technique": "Shaker",
    "garnish": "Fatia fina de maçã verde",
    "shaken": true,
    "tags": [
      "Autoral",
      "Cítrico / Ácido",
      "Frutado",
      "Rum"
    ]
  },
  {
    "name": "Garden Siciliano",
    "category": "Refrescantes",
    "ingredients": [
      {
        "n": "Gin",
        "q": "50 ml"
      },
      {
        "n": "Limão",
        "q": "25 ml (Siciliano)"
      },
      {
        "n": "Hortelã",
        "q": "10 folhas"
      },
      {
        "n": "Xarope de açúcar",
        "q": "15 ml"
      },
      {
        "n": "Água com gás",
        "q": "80 ml"
      },
      {
        "n": "Gelo",
        "q": "cubos"
      }
    ],
    "steps": "1. Bata gin, limão siciliano, hortelã e xarope com gelo.\n2. Coe duas vezes para copo alto com gelo novo e complete com água com gás.",
    "description": "Jardim cítrico aromático de gin, limão siciliano, hortelã e gás.",
    "story": "Versão da casa inspirada nos coquetéis botânicos ingleses de verão.",
    "glass": "Copo alto / Taça",
    "technique": "Shaker + build",
    "garnish": "Ramo de hortelã e casca de limão siciliano",
    "shaken": true,
    "tags": [
      "Autoral",
      "Refrescante",
      "Herbal / Hortelã",
      "Cítrico / Ácido",
      "Gin"
    ]
  },
  {
    "name": "Old Fashioned Caiçara",
    "category": "Fortes",
    "ingredients": [
      {
        "n": "Cachaça",
        "q": "60 ml (Ouro)"
      },
      {
        "n": "Açúcar",
        "q": "10 ml xarope"
      },
      {
        "n": "Angostura",
        "q": "2 dashes"
      },
      {
        "n": "Laranja",
        "q": "1 casca"
      },
      {
        "n": "Gelo",
        "q": "1 cubo grande"
      }
    ],
    "steps": "1. Mexa cachaça ouro, xarope de açúcar e Angostura em copo baixo com cubo grande de gelo por 25s.\n2. Expresse óleos essenciais de casca de laranja por cima.",
    "description": "Old Fashioned de alambique envelhecido com baunilha natural da madeira.",
    "story": "Mostra a força da cachaça envelhecida em carvalho ou umburana quando tratada com o respeito de um grande whisky.",
    "glass": "Old fashioned",
    "technique": "Mexido no copo",
    "garnish": "Casca de laranja",
    "shaken": false,
    "tags": [
      "Autoral",
      "Brasileiro",
      "Forte",
      "Curto",
      "Cachaça"
    ]
  },
  {
    "name": "Manhattan Carioca",
    "category": "Fortes",
    "ingredients": [
      {
        "n": "Cachaça",
        "q": "50 ml (Ouro)"
      },
      {
        "n": "Vermute",
        "q": "25 ml (Tinto)"
      },
      {
        "n": "Angostura",
        "q": "2 dashes"
      },
      {
        "n": "Laranja",
        "q": "1 casca"
      },
      {
        "n": "Gelo",
        "q": "para mexer"
      }
    ],
    "steps": "1. Mexa cachaça ouro, vermute tinto e Angostura em mixing glass com gelo.\n2. Coe para taça coupe gelada e perfume com casca de laranja.",
    "description": "Manhattan brasileiro coado e elegante em taça coupe.",
    "story": "Ponte entre o Rabo de Galo paulistano e o clássico nova-iorquino servido sem gelo.",
    "glass": "Taça Coupe",
    "technique": "Mexido",
    "garnish": "Casca de laranja",
    "shaken": false,
    "tags": [
      "Autoral",
      "Brasileiro",
      "Forte",
      "Curto",
      "Cachaça"
    ]
  },
  {
    "name": "Cachaça Margarita Tropical",
    "category": "Cítricos",
    "ingredients": [
      {
        "n": "Cachaça",
        "q": "50 ml (Prata)"
      },
      {
        "n": "Maracujá",
        "q": "0.5 fruta"
      },
      {
        "n": "Limão",
        "q": "20 ml (Taiti)"
      },
      {
        "n": "Xarope de açúcar",
        "q": "15 ml"
      },
      {
        "n": "Sal",
        "q": "na borda"
      },
      {
        "n": "Gelo",
        "q": "para bater"
      }
    ],
    "steps": "1. Faça meia borda de sal no copo baixo.\n2. Bata cachaça, maracujá, limão e xarope com muito gelo.\n3. Coe sobre gelo novo no copo preparado.",
    "description": "Cachaça prata com maracujá, limão e borda de sal que realça o sabor.",
    "story": "Troca a tequila pela cachaça fresca numa releitura tropical brasileira da Margarita.",
    "glass": "Copo baixo",
    "technique": "Shaker",
    "garnish": "Meia borda de sal e casca de limão",
    "shaken": true,
    "tags": [
      "Autoral",
      "Brasileiro",
      "Tropical",
      "Cítrico / Ácido",
      "Cachaça"
    ]
  },
  {
    "name": "Guaraná Spritz",
    "category": "Aperitivos",
    "ingredients": [
      {
        "n": "Vermute",
        "q": "60 ml (Tinto)"
      },
      {
        "n": "Guaraná",
        "q": "90 ml"
      },
      {
        "n": "Limão",
        "q": "15 ml (Taiti)"
      },
      {
        "n": "Laranja",
        "q": "1 rodela"
      },
      {
        "n": "Gelo",
        "q": "cubos"
      }
    ],
    "steps": "1. Encha uma taça de vinho com muito gelo.\n2. Adicione vermute tinto e suco de limão e complete com guaraná gelado.",
    "description": "Spritz verde-amarelo de vermute tinto, limão e guaraná bem gelado.",
    "story": "Nascido na Campos House como alternativa brasileira e leve aos spritzes europeus.",
    "glass": "Taça de vinho",
    "technique": "Montado na taça",
    "garnish": "Rodela de laranja",
    "shaken": false,
    "tags": [
      "Autoral",
      "Brasileiro",
      "Refrescante",
      "Vermute & Aperitivos"
    ]
  },
  {
    "name": "Pink Lemonade Gin",
    "category": "Cítricos",
    "ingredients": [
      {
        "n": "Gin",
        "q": "50 ml"
      },
      {
        "n": "Morango",
        "q": "3 unid"
      },
      {
        "n": "Limão",
        "q": "25 ml (Siciliano)"
      },
      {
        "n": "Xarope de groselha",
        "q": "15 ml"
      },
      {
        "n": "Água com gás",
        "q": "80 ml"
      },
      {
        "n": "Gelo",
        "q": "cubos"
      }
    ],
    "steps": "1. Bata gin, morangos, limão siciliano e groselha com gelo.\n2. Coe sobre gelo novo no copo alto e complete com água com gás.",
    "description": "Limonada rosada espumante com base botânica de gin e morango fresco.",
    "story": "Visual encantador e equilíbrio cítrico que agrada de primeira em qualquer mesa.",
    "glass": "Copo alto / Taça",
    "technique": "Shaker + build",
    "garnish": "Morango e rodela de limão siciliano",
    "shaken": true,
    "tags": [
      "Autoral",
      "Frutado",
      "Cítrico / Ácido",
      "Refrescante",
      "Gin"
    ]
  },
  {
    "name": "Mojito Maracujá e Gengibre",
    "category": "Autorais",
    "ingredients": [
      {
        "n": "Rum",
        "q": "50 ml (Branco)"
      },
      {
        "n": "Maracujá",
        "q": "0.5 fruta"
      },
      {
        "n": "Xarope de gengibre",
        "q": "15 ml"
      },
      {
        "n": "Hortelã",
        "q": "8 folhas"
      },
      {
        "n": "Limão",
        "q": "15 ml (Taiti)"
      },
      {
        "n": "Água com gás",
        "q": "60 ml"
      },
      {
        "n": "Gelo",
        "q": "cubos"
      }
    ],
    "steps": "1. Pressione suavemente a hortelã com polpa de maracujá e xarope de gengibre.\n2. Adicione rum, limão e gelo e complete com água com gás.",
    "description": "Mojito autoral explosivo com sementes de maracujá e final de gengibre.",
    "story": "Releitura caribenha criada na casa para elevar o Mojito com acidez tropical e picância.",
    "glass": "Copo alto",
    "technique": "Macerado + build",
    "garnish": "Hortelã e maracujá",
    "shaken": false,
    "tags": [
      "Autoral",
      "Tropical",
      "Picante / Gengibre",
      "Herbal / Hortelã",
      "Rum"
    ]
  },
  {
    "name": "Sunset Campos",
    "category": "Autorais",
    "ingredients": [
      {
        "n": "Vodka",
        "q": "50 ml"
      },
      {
        "n": "Abacaxi",
        "q": "50 g"
      },
      {
        "n": "Maracujá",
        "q": "0.5 fruta"
      },
      {
        "n": "Xarope de groselha",
        "q": "15 ml"
      },
      {
        "n": "Limão",
        "q": "15 ml (Taiti)"
      },
      {
        "n": "Gelo",
        "q": "cubos"
      }
    ],
    "steps": "1. Bata vodka, abacaxi macerado, maracujá e limão com gelo.\n2. Coe sobre gelo em copo alto e despeje a groselha devagar pela borda para formar degradê.",
    "description": "Degradê de pôr do sol com abacaxi, maracujá, vodka e fundo rubi.",
    "story": "Cartão de visitas visual da Campos House servido em degradê laranja e vermelho.",
    "glass": "Copo alto",
    "technique": "Shaker + camadas",
    "garnish": "Fatia de abacaxi",
    "shaken": true,
    "tags": [
      "Autoral",
      "Tropical",
      "Frutado",
      "Vodka"
    ]
  },
  {
    "name": "Dark Brasileiro",
    "category": "Autorais",
    "ingredients": [
      {
        "n": "Cachaça",
        "q": "50 ml (Ouro)"
      },
      {
        "n": "Xarope de gengibre",
        "q": "25 ml"
      },
      {
        "n": "Limão",
        "q": "20 ml (Taiti)"
      },
      {
        "n": "Água com gás",
        "q": "90 ml"
      },
      {
        "n": "Gelo",
        "q": "cubos"
      }
    ],
    "steps": "1. Encha o copo alto com gelo.\n2. Despeje xarope de gengibre, limão e água com gás.\n3. Flutue a cachaça ouro por cima como no Dark ’n’ Stormy.",
    "description": "Versão brasileira do Dark ’n’ Stormy feita com cachaça envelhecida.",
    "story": "Substitui o rum escuro caribenho pela cachaça ouro, destacando notas amadeiradas junto ao gengibre.",
    "glass": "Copo alto",
    "technique": "Montado em camadas",
    "garnish": "Rodela de limão",
    "shaken": false,
    "tags": [
      "Autoral",
      "Brasileiro",
      "Picante / Gengibre",
      "Refrescante",
      "Cachaça"
    ]
  },
  {
    "name": "Morango Picante",
    "category": "Autorais",
    "ingredients": [
      {
        "n": "Vodka",
        "q": "50 ml"
      },
      {
        "n": "Morango",
        "q": "4 unid"
      },
      {
        "n": "Pimenta",
        "q": "2 rodelas finas (dedo-de-moça)"
      },
      {
        "n": "Limão",
        "q": "20 ml (Taiti)"
      },
      {
        "n": "Xarope de açúcar",
        "q": "15 ml"
      },
      {
        "n": "Gelo",
        "q": "para bater"
      }
    ],
    "steps": "1. Macere os morangos com uma rodela fina de pimenta e xarope.\n2. Adicione vodka, limão e gelo e bata forte.\n3. Coe duas vezes sobre gelo novo.",
    "description": "Morangos doces cortados por pimenta dedo-de-moça fresca e limão.",
    "story": "Autoral de contraste marcante que surpreende no primeiro gole e convida ao segundo.",
    "glass": "Copo baixo",
    "technique": "Macerado + shaker",
    "garnish": "Morango e pontinha de pimenta",
    "shaken": true,
    "tags": [
      "Autoral",
      "Picante / Gengibre",
      "Frutado",
      "Vodka"
    ]
  },
  {
    "name": "Caipi Abacaxi, Hortelã e Gengibre",
    "category": "Brasileiríssimos",
    "ingredients": [
      {
        "n": "Cachaça",
        "q": "50 ml (Prata)"
      },
      {
        "n": "Abacaxi",
        "q": "70 g"
      },
      {
        "n": "Hortelã",
        "q": "6 folhas"
      },
      {
        "n": "Gengibre",
        "q": "2 fatias"
      },
      {
        "n": "Açúcar",
        "q": "1.5 colher"
      },
      {
        "n": "Limão",
        "q": "15 ml (Taiti)"
      },
      {
        "n": "Gelo",
        "q": "cubos"
      }
    ],
    "steps": "1. Macere abacaxi, gengibre e açúcar no shaker.\n2. Adicione hortelã, limão, cachaça e gelo e bata forte.\n3. Sirva sem coar no copo baixo.",
    "description": "Caipirinha super aromática que combina doçura do abacaxi, frescor e gengibre.",
    "story": "Receita querida de festas brasileiras por entregar explosão de sabores naturais no copo.",
    "glass": "Copo baixo",
    "technique": "Macerado + shaker",
    "garnish": "Folha de abacaxi e hortelã",
    "shaken": true,
    "tags": [
      "Autoral",
      "Brasileiro",
      "Tropical",
      "Picante / Gengibre",
      "Cachaça"
    ]
  },
  {
    "name": "Green Apple Gin Fizz",
    "category": "Refrescantes",
    "ingredients": [
      {
        "n": "Gin",
        "q": "50 ml"
      },
      {
        "n": "Xarope de maçã verde",
        "q": "20 ml"
      },
      {
        "n": "Limão",
        "q": "20 ml (Siciliano)"
      },
      {
        "n": "Água com gás",
        "q": "80 ml"
      },
      {
        "n": "Gelo",
        "q": "cubos"
      }
    ],
    "steps": "1. Bata gin, xarope de maçã verde e limão siciliano com gelo.\n2. Coe para copo alto com gelo novo e complete com água com gás.",
    "description": "Gin fizz refrescante e esverdeado com acidez crocante de maçã verde.",
    "story": "Releitura refrescante do clássico Gin Fizz que conquista visualmente pela cor verde-clara.",
    "glass": "Copo alto",
    "technique": "Shaker + build",
    "garnish": "Fatia fina de maçã ou limão",
    "shaken": true,
    "tags": [
      "Autoral",
      "Refrescante",
      "Cítrico / Ácido",
      "Com soda / Tônica",
      "Gin"
    ]
  },
  {
    "name": "Jesus Mule",
    "category": "Autorais",
    "ingredients": [
      {
        "n": "Vodka",
        "q": "50 ml"
      },
      {
        "n": "Xarope de gengibre",
        "q": "15 ml"
      },
      {
        "n": "Limão",
        "q": "15 ml (Taiti)"
      },
      {
        "n": "Guaraná",
        "q": "100 ml"
      },
      {
        "n": "Hortelã",
        "q": "4 folhas"
      },
      {
        "n": "Gelo",
        "q": "cubos"
      }
    ],
    "steps": "1. Encha a caneca com gelo.\n2. Adicione vodka, xarope de gengibre e limão.\n3. Complete com guaraná bem gelado e decore com hortelã e limão.",
    "description": "Moscow Mule abrasileirado com guaraná gelado no lugar da água com gás.",
    "story": "Brincadeira criativa de balcão brasileiro que substitui o gás neutro pelo guaraná doce e aromático.",
    "glass": "Caneca / Copo alto",
    "technique": "Montado na caneca",
    "garnish": "Rodela de limão e hortelã",
    "shaken": false,
    "tags": [
      "Autoral",
      "Brasileiro",
      "Picante / Gengibre",
      "Doce",
      "Vodka"
    ]
  },
  {
    "name": "Curupira Reverso",
    "category": "Brasileiríssimos",
    "ingredients": [
      {
        "n": "Cachaça",
        "q": "50 ml (Prata)"
      },
      {
        "n": "Hortelã",
        "q": "10 folhas"
      },
      {
        "n": "Xarope de gengibre",
        "q": "20 ml"
      },
      {
        "n": "Limão",
        "q": "20 ml (Taiti)"
      },
      {
        "n": "Gelo",
        "q": "para bater"
      }
    ],
    "steps": "1. Macere suavemente a hortelã com xarope de gengibre.\n2. Adicione cachaça e limão, bata forte com gelo e coe duas vezes sobre gelo novo.",
    "description": "Verde-mata intenso e herbáceo unindo cachaça, hortelã e gengibre.",
    "story": "Batizado em homenagem ao folclore brasileiro — refrescante na entrada, marcante na saída.",
    "glass": "Copo baixo",
    "technique": "Macerado + shaker",
    "garnish": "Ramo de hortelã",
    "shaken": true,
    "tags": [
      "Autoral",
      "Brasileiro",
      "Herbal / Hortelã",
      "Picante / Gengibre",
      "Cachaça"
    ]
  },
  {
    "name": "Raio de Sol Salgado",
    "category": "Cítricos",
    "ingredients": [
      {
        "n": "Cachaça",
        "q": "50 ml (Prata)"
      },
      {
        "n": "Maracujá",
        "q": "1 fruta"
      },
      {
        "n": "Limão",
        "q": "20 ml (Taiti)"
      },
      {
        "n": "Xarope de açúcar",
        "q": "15 ml"
      },
      {
        "n": "Sal",
        "q": "1 pitada"
      },
      {
        "n": "Gelo",
        "q": "para bater"
      }
    ],
    "steps": "1. Coloque polpa de maracujá, cachaça, limão, xarope e uma pitada de sal na coqueteleira.\n2. Bata forte com gelo e coe sobre cubo novo.",
    "description": "Maracujá fresco e cachaça despertados por uma pitada mágica de sal.",
    "story": "Truque de mixologia que prova como uma pitada de sal abre o aroma e reduz o amargor do maracujá.",
    "glass": "Copo baixo",
    "technique": "Shaker",
    "garnish": "Casca de limão",
    "shaken": true,
    "tags": [
      "Autoral",
      "Brasileiro",
      "Tropical",
      "Cítrico / Ácido",
      "Cachaça"
    ]
  },
  {
    "name": "Eclipse Verde",
    "category": "Autorais",
    "ingredients": [
      {
        "n": "Cachaça",
        "q": "50 ml (Prata)"
      },
      {
        "n": "Xarope de maçã verde",
        "q": "25 ml"
      },
      {
        "n": "Xarope de gengibre",
        "q": "15 ml"
      },
      {
        "n": "Limão",
        "q": "20 ml (Taiti)"
      },
      {
        "n": "Água com gás",
        "q": "60 ml"
      },
      {
        "n": "Gelo",
        "q": "cubos"
      }
    ],
    "steps": "1. Bata cachaça, xaropes de maçã verde e gengibre e limão com gelo.\n2. Coe para copo alto com gelo novo e complete com água com gás.",
    "description": "Contraste vibrante de maçã verde ácida, gengibre e cachaça prata.",
    "story": "Criado para quem gosta de drinks verdes vibrantes com final picante e efervescente.",
    "glass": "Copo alto",
    "technique": "Shaker + build",
    "garnish": "Fatia de limão",
    "shaken": true,
    "tags": [
      "Autoral",
      "Refrescante",
      "Picante / Gengibre",
      "Cachaça"
    ]
  },
  {
    "name": "Sertão Doce",
    "category": "Cítricos",
    "ingredients": [
      {
        "n": "Cachaça",
        "q": "50 ml (Prata)"
      },
      {
        "n": "Abacaxi",
        "q": "50 g"
      },
      {
        "n": "Maracujá",
        "q": "0.5 fruta"
      },
      {
        "n": "Xarope de gengibre",
        "q": "10 ml"
      },
      {
        "n": "Sal",
        "q": "1 pitada"
      },
      {
        "n": "Gelo",
        "q": "para bater"
      }
    ],
    "steps": "1. Macere o abacaxi no fundo do shaker.\n2. Adicione maracujá, cachaça, gengibre e sal e bata com gelo.\n3. Coe duas vezes sobre gelo novo.",
    "description": "Abacaxi doce, maracujá ácido e pitada de sal em tributo ao Nordeste.",
    "story": "Inspirado no contraste salgado-doce da culinária sertaneja com frutas tropicais.",
    "glass": "Copo baixo",
    "technique": "Macerado + shaker",
    "garnish": "Fatia de abacaxi",
    "shaken": true,
    "tags": [
      "Autoral",
      "Brasileiro",
      "Tropical",
      "Cítrico / Ácido",
      "Cachaça"
    ]
  },
  {
    "name": "Engenho Velho",
    "category": "Fortes",
    "ingredients": [
      {
        "n": "Cachaça",
        "q": "60 ml (Ouro)"
      },
      {
        "n": "Xarope de açúcar",
        "q": "10 ml"
      },
      {
        "n": "Vermute",
        "q": "15 ml (Tinto)"
      },
      {
        "n": "Gelo",
        "q": "1 cubo grande"
      }
    ],
    "steps": "1. Misture cachaça ouro, vermute tinto e xarope de açúcar com cubo grande de gelo.\n2. Mexa lentamente por 25 segundos até resfriar bem.",
    "description": "Curto, encorpado e amadeirado: cachaça ouro arredondada com vermute.",
    "story": "Homenagem aos alambiques antigos onde a cachaça descansa em madeira brasileira.",
    "glass": "Old fashioned",
    "technique": "Mexido no copo",
    "garnish": "Casca de limão ou laranja",
    "shaken": false,
    "tags": [
      "Autoral",
      "Brasileiro",
      "Forte",
      "Curto",
      "Cachaça"
    ]
  },
  {
    "name": "Beira-Mar",
    "category": "Refrescantes",
    "ingredients": [
      {
        "n": "Cachaça",
        "q": "45 ml (Prata)"
      },
      {
        "n": "Limão",
        "q": "20 ml (Siciliano)"
      },
      {
        "n": "Xarope de açúcar",
        "q": "15 ml"
      },
      {
        "n": "Água tônica",
        "q": "90 ml"
      },
      {
        "n": "Sal",
        "q": "1 pitada"
      },
      {
        "n": "Gelo",
        "q": "cubos"
      }
    ],
    "steps": "1. Dissolva uma pitada de sal no xarope com suco de limão siciliano na taça.\n2. Encha de gelo, adicione cachaça prata e complete com água tônica.",
    "description": "Seco, salgadinho como maresia e refrescante com limão siciliano e tônica.",
    "story": "Tônica de cachaça criada para dias quentes à beira da piscina ou do mar.",
    "glass": "Taça balão",
    "technique": "Montado na taça",
    "garnish": "Casca de limão siciliano",
    "shaken": false,
    "tags": [
      "Autoral",
      "Brasileiro",
      "Refrescante",
      "Com soda / Tônica",
      "Cachaça"
    ]
  },
  {
    "name": "Cobre Líquido",
    "category": "Fortes",
    "ingredients": [
      {
        "n": "Rum",
        "q": "50 ml (Branco)"
      },
      {
        "n": "Vermute",
        "q": "25 ml (Tinto)"
      },
      {
        "n": "Xarope de gengibre",
        "q": "7 ml"
      },
      {
        "n": "Gelo",
        "q": "1 cubo grande"
      }
    ],
    "steps": "1. Mexa rum, vermute tinto e toque de xarope de gengibre com gelo por 25 segundos.\n2. Coe sobre gelo grande no copo baixo.",
    "description": "Rum aveludado com vermute tinto e sutil calor picante de gengibre.",
    "story": "Variação enxuta e elegante inspirada nos alambiques de cobre caribenhos.",
    "glass": "Old fashioned",
    "technique": "Mexido",
    "garnish": "Casca de limão",
    "shaken": false,
    "tags": [
      "Autoral",
      "Forte",
      "Curto",
      "Rum"
    ]
  },
  {
    "name": "Oásis",
    "category": "Refrescantes",
    "ingredients": [
      {
        "n": "Rum",
        "q": "50 ml (Branco)"
      },
      {
        "n": "Maracujá",
        "q": "1 fruta"
      },
      {
        "n": "Hortelã",
        "q": "10 folhas"
      },
      {
        "n": "Limão",
        "q": "20 ml (Taiti)"
      },
      {
        "n": "Xarope de açúcar",
        "q": "15 ml"
      },
      {
        "n": "Água com gás",
        "q": "50 ml"
      },
      {
        "n": "Gelo",
        "q": "cubos"
      }
    ],
    "steps": "1. Pressione suavemente hortelã, polpa de maracujá e xarope no fundo do copo.\n2. Adicione rum, limão, gelo e complete com água com gás.",
    "description": "Mojito tropical de maracujá fresco com aroma refrescante de hortelã.",
    "story": "Receita refrescante de verão que combina o melhor do Mojito com a acidez do maracujá.",
    "glass": "Copo alto",
    "technique": "Macerado + build",
    "garnish": "Ramo de hortelã",
    "shaken": false,
    "tags": [
      "Autoral",
      "Refrescante",
      "Tropical",
      "Herbal / Hortelã",
      "Rum"
    ]
  },
  {
    "name": "Tempestade Amarela",
    "category": "Refrescantes",
    "ingredients": [
      {
        "n": "Rum",
        "q": "50 ml (Branco)"
      },
      {
        "n": "Xarope de gengibre",
        "q": "25 ml"
      },
      {
        "n": "Limão",
        "q": "15 ml (Taiti)"
      },
      {
        "n": "Água com gás",
        "q": "90 ml"
      },
      {
        "n": "Gelo",
        "q": "cubos"
      }
    ],
    "steps": "1. Encha o copo alto com gelo.\n2. Adicione rum, xarope de gengibre e limão e complete com água com gás.",
    "description": "Versão clara e dourada do Dark ’n’ Stormy com rum branco e gengibre.",
    "story": "Direto, picante e refrescante para quem ama drinks com gengibre no estoque da casa.",
    "glass": "Copo alto",
    "technique": "Montado no copo",
    "garnish": "Rodela de limão",
    "shaken": false,
    "tags": [
      "Refrescante",
      "Picante / Gengibre",
      "Longo",
      "Rum"
    ]
  },
  {
    "name": "Maré Alta",
    "category": "Refrescantes",
    "ingredients": [
      {
        "n": "Rum",
        "q": "45 ml (Branco)"
      },
      {
        "n": "Limão",
        "q": "15 ml (Siciliano)"
      },
      {
        "n": "Água tônica",
        "q": "110 ml"
      },
      {
        "n": "Hortelã",
        "q": "6 folhas"
      },
      {
        "n": "Gelo",
        "q": "cubos"
      }
    ],
    "steps": "1. Pressione a hortelã levemente na taça ou copo alto.\n2. Encha de gelo, adicione rum e limão siciliano e complete com tônica.",
    "description": "Rum leve com hortelã, limão siciliano e frescor amargo de tônica.",
    "story": "Alternativa praiana ao Gin Tônica que surpreende pela leveza aromática do rum branco.",
    "glass": "Copo alto",
    "technique": "Montado no copo",
    "garnish": "Folha de hortelã",
    "shaken": false,
    "tags": [
      "Refrescante",
      "Com soda / Tônica",
      "Herbal / Hortelã",
      "Rum"
    ]
  },
  {
    "name": "Old Fashioned Tropical",
    "category": "Fortes",
    "ingredients": [
      {
        "n": "Rum",
        "q": "40 ml (Branco)"
      },
      {
        "n": "Conhaque",
        "q": "20 ml"
      },
      {
        "n": "Abacaxi",
        "q": "45 g"
      },
      {
        "n": "Xarope de açúcar",
        "q": "10 ml"
      },
      {
        "n": "Gelo",
        "q": "1 cubo grande"
      }
    ],
    "steps": "1. Macere suavemente o abacaxi com o xarope no copo ou mixing glass.\n2. Adicione rum, conhaque e gelo, mexa por 25s e coe sobre cubo grande.",
    "description": "Rum e conhaque arredondados com doçura frutada de abacaxi.",
    "story": "Ponte entre a coquetelaria clássica de bar de madeira e o frescor tropical.",
    "glass": "Old fashioned",
    "technique": "Macerado + mexido",
    "garnish": "Abacaxi desidratado ou fresco",
    "shaken": false,
    "tags": [
      "Autoral",
      "Forte",
      "Curto",
      "Rum",
      "Conhaque"
    ]
  },
  {
    "name": "Trovoada de Abacaxi",
    "category": "Refrescantes",
    "ingredients": [
      {
        "n": "Cachaça",
        "q": "45 ml (Prata)"
      },
      {
        "n": "Abacaxi",
        "q": "60 g"
      },
      {
        "n": "Xarope de gengibre",
        "q": "15 ml"
      },
      {
        "n": "Limão",
        "q": "15 ml (Taiti)"
      },
      {
        "n": "Hortelã",
        "q": "5 folhas"
      },
      {
        "n": "Gelo",
        "q": "para bater"
      }
    ],
    "steps": "1. Macere abacaxi e hortelã no fundo da coqueteleira.\n2. Adicione cachaça, gengibre e limão, bata com gelo e coe sobre gelo novo.",
    "description": "Abacaxi doce, picância de gengibre e cachaça prata em copo baixo.",
    "story": "Um dos destaques tropicais da casa por entregar fruta fresca com contraste picante.",
    "glass": "Copo baixo",
    "technique": "Macerado + shaker",
    "garnish": "Folha de hortelã",
    "shaken": true,
    "tags": [
      "Autoral",
      "Tropical",
      "Picante / Gengibre",
      "Cachaça"
    ]
  },
  {
    "name": "Coral Tropical",
    "category": "Refrescantes",
    "ingredients": [
      {
        "n": "Cachaça",
        "q": "45 ml (Prata)"
      },
      {
        "n": "Maracujá",
        "q": "1 fruta"
      },
      {
        "n": "Xarope de groselha",
        "q": "10 ml"
      },
      {
        "n": "Limão",
        "q": "15 ml (Taiti)"
      },
      {
        "n": "Água tônica",
        "q": "80 ml"
      },
      {
        "n": "Gelo",
        "q": "cubos"
      }
    ],
    "steps": "1. Coloque polpa de maracujá e muito gelo na taça balão.\n2. Adicione cachaça, limão e groselha e complete com água tônica.",
    "description": "Maracujá, groselha e tônica em tons alaranjados de recife de coral.",
    "story": "Leve, colorido e perfeito para fotos ao sol ou em mesas externas.",
    "glass": "Taça balão",
    "technique": "Montado na taça",
    "garnish": "Meia casca de maracujá",
    "shaken": false,
    "tags": [
      "Autoral",
      "Tropical",
      "Com soda / Tônica",
      "Cachaça"
    ]
  },
  {
    "name": "Garoa Gelada",
    "category": "Refrescantes",
    "ingredients": [
      {
        "n": "Cachaça",
        "q": "50 ml (Prata)"
      },
      {
        "n": "Refrigerante de limão",
        "q": "100 ml"
      },
      {
        "n": "Xarope de groselha",
        "q": "10 ml"
      },
      {
        "n": "Limão",
        "q": "10 ml (Taiti)"
      },
      {
        "n": "Gelo",
        "q": "cubos"
      }
    ],
    "steps": "1. Encha um copo alto com gelo.\n2. Despeje cachaça prata, limão e groselha e complete com refrigerante de limão.",
    "description": "Refrescante, rosado e fácil de beber com refrigerante de limão e cachaça.",
    "story": "Inspirado nas tardes de chuva fina em São Paulo — simples no preparo, marcante na cor.",
    "glass": "Copo alto",
    "technique": "Montado no copo",
    "garnish": "Rodela de limão",
    "shaken": false,
    "tags": [
      "Autoral",
      "Brasileiro",
      "Refrescante",
      "Longo",
      "Cachaça"
    ]
  },
  {
    "name": "Brandy Fix",
    "category": "Cítricos",
    "ingredients": [
      {
        "n": "Conhaque",
        "q": "50 ml"
      },
      {
        "n": "Abacaxi",
        "q": "45 g"
      },
      {
        "n": "Limão",
        "q": "20 ml (Siciliano)"
      },
      {
        "n": "Xarope de açúcar",
        "q": "15 ml"
      },
      {
        "n": "Gelo",
        "q": "triturado"
      }
    ],
    "steps": "1. Macere o abacaxi com xarope e limão.\n2. Adicione conhaque e gelo, bata rápido e sirva sobre gelo triturado.",
    "description": "Clássico oitocentista de conhaque batido com abacaxi e limão no gelo picado.",
    "story": "Documentado por Jerry Thomas em 1862 como um dos “Fixes” refrescantes de verão antes da invenção das geladeiras modernas.",
    "glass": "Copo baixo",
    "technique": "Macerado + shaker",
    "garnish": "Fatia de abacaxi e hortelã",
    "shaken": true,
    "tags": [
      "Clássico",
      "Cítrico / Ácido",
      "Frutado",
      "Conhaque"
    ]
  },
  {
    "name": "Vodka Rickey",
    "category": "Refrescantes",
    "ingredients": [
      {
        "n": "Vodka",
        "q": "50 ml"
      },
      {
        "n": "Limão",
        "q": "25 ml (Taiti)"
      },
      {
        "n": "Água com gás",
        "q": "120 ml"
      },
      {
        "n": "Gelo",
        "q": "cubos"
      }
    ],
    "steps": "1. Encha um copo alto com gelo.\n2. Esprema o limão fresco e solte a casca dentro.\n3. Adicione vodka e complete com água com gás.",
    "description": "Levíssimo, zero açúcar e cristalino: vodka, limão fresco e gás.",
    "story": "Variação contemporânea do clássico Rickey de 1880 para quem busca drink bem seco e pouco calórico.",
    "glass": "Copo alto",
    "technique": "Montado no copo",
    "garnish": "Meio limão taiti",
    "shaken": false,
    "tags": [
      "Refrescante",
      "Cítrico / Ácido",
      "Com soda / Tônica",
      "Vodka"
    ]
  },
  {
    "name": "Blue Lagoon",
    "category": "Doces & Frutados",
    "ingredients": [
      {
        "n": "Vodka",
        "q": "45 ml"
      },
      {
        "n": "Curaçau Blue",
        "q": "20 ml"
      },
      {
        "n": "Refrigerante de limão",
        "q": "120 ml"
      },
      {
        "n": "Limão",
        "q": "15 ml (Siciliano)"
      },
      {
        "n": "Gelo",
        "q": "cubos"
      }
    ],
    "steps": "1. Encha um copo alto com gelo.\n2. Despeje vodka, Curaçau Blue e suco de limão.\n3. Complete com refrigerante de limão e mexa leve.",
    "description": "Azul vibrante tropical com sabor cítrico doce de laranja curaçau.",
    "story": "Criado em Paris nos anos 1960 por Andy MacElhone no Harry’s New York Bar — o drink azul mais famoso do planeta.",
    "glass": "Copo alto / Hurricane",
    "technique": "Montado no copo",
    "garnish": "Rodela de limão e cereja",
    "shaken": false,
    "tags": [
      "Clássico",
      "Doce",
      "Refrescante",
      "Longo",
      "Vodka"
    ]
  },
  {
    "name": "Grasshopper",
    "category": "Doces & Frutados",
    "ingredients": [
      {
        "n": "Licor de hortelã",
        "q": "30 ml (Verde)"
      },
      {
        "n": "Licor de cacau",
        "q": "30 ml (Branco)"
      },
      {
        "n": "Creme de leite",
        "q": "30 ml"
      },
      {
        "n": "Chocolate ralado",
        "q": "1 pitada"
      },
      {
        "n": "Gelo",
        "q": "para bater"
      }
    ],
    "steps": "1. Bata partes iguais de licor de menta verde, licor de cacau e creme de leite com gelo por 15s.\n2. Coe para taça coupe gelada e polvilhe chocolate.",
    "description": "Sobremesa líquida verde-menta com cacau branco e creme de leite.",
    "story": "Criado por Philibert Guichet Jr. no Tujague’s em Nova Orleans por volta de 1918 — sabor nostálgico de chocolate com menta.",
    "glass": "Taça Coupe",
    "technique": "Shaker vigoroso",
    "garnish": "Raspas de chocolate",
    "shaken": true,
    "tags": [
      "Clássico",
      "Cremoso",
      "Doce",
      "Herbal / Hortelã"
    ]
  },
  {
    "name": "Mudslide",
    "category": "Doces & Frutados",
    "ingredients": [
      {
        "n": "Vodka",
        "q": "30 ml"
      },
      {
        "n": "Licor de café",
        "q": "30 ml"
      },
      {
        "n": "Licor de creme (Baileys)",
        "q": "30 ml"
      },
      {
        "n": "Creme de leite",
        "q": "30 ml"
      },
      {
        "n": "Calda de chocolate",
        "q": "10 ml"
      },
      {
        "n": "Gelo",
        "q": "para bater"
      }
    ],
    "steps": "1. Decore a taça internamente com calda de chocolate.\n2. Bata vodka, licor de café, Baileys e creme de leite com gelo e coe.",
    "description": "Café, creme irlandês Baileys, vodka e calda de chocolate em taça sedosa.",
    "story": "Nascido nos anos 1970 no Wreck Bar das Ilhas Cayman como uma variação de White Russian com Baileys.",
    "glass": "Taça Coupe / Copo baixo",
    "technique": "Shaker",
    "garnish": "Raspas e calda de chocolate",
    "shaken": true,
    "tags": [
      "Clássico",
      "Cremoso",
      "Doce",
      "Vodka"
    ]
  },
  {
    "name": "Chocolate Martini",
    "category": "Doces & Frutados",
    "ingredients": [
      {
        "n": "Vodka",
        "q": "45 ml"
      },
      {
        "n": "Licor de cacau",
        "q": "25 ml"
      },
      {
        "n": "Licor de creme (Baileys)",
        "q": "25 ml"
      },
      {
        "n": "Calda de chocolate",
        "q": "10 ml"
      },
      {
        "n": "Gelo",
        "q": "para bater"
      }
    ],
    "steps": "1. Faça desenhos com calda de chocolate na taça martini gelada.\n2. Bata vodka, licor de cacau e Baileys com muito gelo e coe.",
    "description": "Martini cremoso e achocolatado feito para encerrar a noite em grande estilo.",
    "story": "Clássico das cartas de sobremesa americanas desde os anos 1990 pela textura veludosa.",
    "glass": "Taça Martini",
    "technique": "Shaker",
    "garnish": "Calda e raspas de chocolate",
    "shaken": true,
    "tags": [
      "Cremoso",
      "Doce",
      "Vodka"
    ]
  },
  {
    "name": "Woo Woo",
    "category": "Doces & Frutados",
    "ingredients": [
      {
        "n": "Vodka",
        "q": "45 ml"
      },
      {
        "n": "Licor de pêssego",
        "q": "25 ml"
      },
      {
        "n": "Suco de cranberry",
        "q": "90 ml"
      },
      {
        "n": "Limão",
        "q": "1 gomo"
      },
      {
        "n": "Gelo",
        "q": "cubos"
      }
    ],
    "steps": "1. Bata ou misture vodka, licor de pêssego e suco de cranberry com muito gelo.\n2. Sirva em copo alto ou taça com gomo de limão.",
    "description": "Pêssego doce e cranberry vibrante: primo irmão do Sex on the Beach.",
    "story": "Hit dos bares universitários e clubes dos anos 1980 em Nova York — batizado pelos brindes animados do restaurante Woo Woo.",
    "glass": "Copo alto",
    "technique": "Montado ou shaker",
    "garnish": "Gomo de limão",
    "shaken": false,
    "tags": [
      "Clássico",
      "Frutado",
      "Doce",
      "Longo",
      "Vodka"
    ]
  },
  {
    "name": "Bay Breeze",
    "category": "Doces & Frutados",
    "ingredients": [
      {
        "n": "Vodka",
        "q": "45 ml"
      },
      {
        "n": "Suco de cranberry",
        "q": "60 ml"
      },
      {
        "n": "Suco de abacaxi",
        "q": "60 ml"
      },
      {
        "n": "Limão",
        "q": "1 gomo"
      },
      {
        "n": "Gelo",
        "q": "cubos"
      }
    ],
    "steps": "1. Encha um copo alto com gelo.\n2. Despeje vodka, suco de cranberry e suco de abacaxi e mexa leve.",
    "description": "Versão tropical do Sea Breeze trocando a toranja por abacaxi espumoso.",
    "story": "Clássico de resort havaiano muito popular pela leveza frutada e zero amargor.",
    "glass": "Copo alto",
    "technique": "Montado no copo",
    "garnish": "Rodela de limão ou abacaxi",
    "shaken": false,
    "tags": [
      "Clássico",
      "Frutado",
      "Tropical",
      "Refrescante",
      "Vodka"
    ]
  },
  {
    "name": "Harvey Wallbanger",
    "category": "Doces & Frutados",
    "ingredients": [
      {
        "n": "Vodka",
        "q": "45 ml"
      },
      {
        "n": "Suco de laranja",
        "q": "110 ml"
      },
      {
        "n": "Galliano",
        "q": "15 ml"
      },
      {
        "n": "Laranja",
        "q": "1 rodela"
      },
      {
        "n": "Gelo",
        "q": "cubos"
      }
    ],
    "steps": "1. Misture vodka e suco de laranja sobre gelo em copo alto.\n2. Flutue o licor italiano Galliano (baunilha e anis) por cima.",
    "description": "Screwdriver perfumado no topo pelo toque herbáceo-baunilha do Galliano.",
    "story": "Lenda californiana de 1952 sobre um surfista chamado Harvey que batia na parede do bar após derrotas nas ondas.",
    "glass": "Copo alto",
    "technique": "Montado + float",
    "garnish": "Rodela de laranja e cereja",
    "shaken": false,
    "tags": [
      "Clássico",
      "Frutado",
      "Doce",
      "Vodka"
    ]
  },
  {
    "name": "Strawberry Smash",
    "category": "Doces & Frutados",
    "ingredients": [
      {
        "n": "Gin",
        "q": "50 ml"
      },
      {
        "n": "Morango",
        "q": "4 unid"
      },
      {
        "n": "Limão",
        "q": "20 ml (Siciliano)"
      },
      {
        "n": "Xarope de açúcar",
        "q": "15 ml"
      },
      {
        "n": "Hortelã",
        "q": "6 folhas"
      },
      {
        "n": "Gelo",
        "q": "cubos"
      }
    ],
    "steps": "1. Macere morangos e hortelã com xarope na coqueteleira.\n2. Adicione gin, limão siciliano e gelo e bata forte.\n3. Coe sobre gelo novo.",
    "description": "Morangos frescos esmagados com gin botânico, siciliano e hortelã.",
    "story": "Smash frutado clássico de primavera que faz enorme sucesso em jardins e rooftops.",
    "glass": "Copo baixo",
    "technique": "Macerado + shaker",
    "garnish": "Morango e ramo de hortelã",
    "shaken": true,
    "tags": [
      "Frutado",
      "Refrescante",
      "Herbal / Hortelã",
      "Gin"
    ]
  },
  {
    "name": "Mojito de Morango",
    "category": "Doces & Frutados",
    "ingredients": [
      {
        "n": "Rum",
        "q": "50 ml (Branco)"
      },
      {
        "n": "Morango",
        "q": "4 unid"
      },
      {
        "n": "Hortelã",
        "q": "8 folhas"
      },
      {
        "n": "Limão",
        "q": "20 ml (Taiti)"
      },
      {
        "n": "Xarope de açúcar",
        "q": "15 ml"
      },
      {
        "n": "Água com gás",
        "q": "60 ml"
      },
      {
        "n": "Gelo",
        "q": "cubos"
      }
    ],
    "steps": "1. Macere suavemente morangos, hortelã, limão e xarope no fundo do copo.\n2. Adicione rum e gelo e complete com água com gás.",
    "description": "O clássico Mojito cubano tingido de vermelho com morangos frescos.",
    "story": "Uma das variações mais populares dos bares de praia do mundo inteiro.",
    "glass": "Copo alto",
    "technique": "Macerado + build",
    "garnish": "Morango fatiado e hortelã",
    "shaken": false,
    "tags": [
      "Frutado",
      "Refrescante",
      "Herbal / Hortelã",
      "Rum"
    ]
  },
  {
    "name": "Mojito de Abacaxi",
    "category": "Doces & Frutados",
    "ingredients": [
      {
        "n": "Rum",
        "q": "50 ml (Branco)"
      },
      {
        "n": "Abacaxi",
        "q": "60 g"
      },
      {
        "n": "Hortelã",
        "q": "8 folhas"
      },
      {
        "n": "Limão",
        "q": "20 ml (Taiti)"
      },
      {
        "n": "Xarope de açúcar",
        "q": "15 ml"
      },
      {
        "n": "Água com gás",
        "q": "60 ml"
      },
      {
        "n": "Gelo",
        "q": "cubos"
      }
    ],
    "steps": "1. Macere o abacaxi com xarope e limão; pressione a hortelã.\n2. Adicione rum, muito gelo e complete com água com gás.",
    "description": "Mojito ensolarado com pedaços frescos de abacaxi macerado.",
    "story": "Mistura tropical caribenha que amplifica o frescor da hortelã com doçura natural da fruta.",
    "glass": "Copo alto",
    "technique": "Macerado + build",
    "garnish": "Fatia de abacaxi e hortelã",
    "shaken": false,
    "tags": [
      "Tropical",
      "Refrescante",
      "Herbal / Hortelã",
      "Rum"
    ]
  },
  {
    "name": "Piña Sem Coco Frozen",
    "category": "Frozen",
    "ingredients": [
      {
        "n": "Rum",
        "q": "50 ml (Branco)"
      },
      {
        "n": "Abacaxi",
        "q": "120 g"
      },
      {
        "n": "Limão",
        "q": "15 ml (Taiti)"
      },
      {
        "n": "Xarope de açúcar",
        "q": "20 ml"
      },
      {
        "n": "Hortelã",
        "q": "6 folhas"
      },
      {
        "n": "Gelo",
        "q": "150 g"
      }
    ],
    "steps": "1. Bata rum, abacaxi em cubos, limão, xarope, hortelã e bastante gelo no liquidificador até ficar cremoso.\n2. Sirva em taça grande.",
    "description": "Piña colada sem coco: abacaxi gelado batido com rum e hortelã fresca.",
    "story": "Criação da Campos House para quem não curte coco: a cremosidade nasce do próprio abacaxi batido com gelo.",
    "glass": "Taça Hurricane",
    "technique": "Batido (blend)",
    "garnish": "Folha de abacaxi e hortelã",
    "shaken": false,
    "tags": [
      "Autoral",
      "Frozen",
      "Tropical",
      "Refrescante",
      "Rum"
    ]
  },
  {
    "name": "Strawberry Daiquiri",
    "category": "Frozen",
    "ingredients": [
      {
        "n": "Rum",
        "q": "50 ml (Branco)"
      },
      {
        "n": "Morango",
        "q": "5 unid"
      },
      {
        "n": "Xarope de morango",
        "q": "20 ml"
      },
      {
        "n": "Limão",
        "q": "20 ml (Taiti)"
      },
      {
        "n": "Gelo",
        "q": "150 g"
      }
    ],
    "steps": "1. Bata rum, morangos, xarope de morango, limão e bastante gelo no liquidificador até formar raspadinha cremosa.\n2. Sirva em taça hurricane.",
    "description": "O frozen de morango clássico dos resorts com rum branco e limão.",
    "story": "Versão congelada e festiva do Daiquiri clássico que dominou os balcões tropicais desde os anos 1950.",
    "glass": "Taça Hurricane",
    "technique": "Batido (blend)",
    "garnish": "Morango na borda",
    "shaken": false,
    "tags": [
      "Clássico",
      "Frozen",
      "Frutado",
      "Doce",
      "Rum"
    ]
  },
  {
    "name": "Frozen Margarita",
    "category": "Frozen",
    "ingredients": [
      {
        "n": "Tequila",
        "q": "50 ml (Prata)"
      },
      {
        "n": "Triple Sec",
        "q": "25 ml"
      },
      {
        "n": "Limão",
        "q": "25 ml (Taiti)"
      },
      {
        "n": "Xarope de açúcar",
        "q": "10 ml"
      },
      {
        "n": "Sal",
        "q": "na borda"
      },
      {
        "n": "Gelo",
        "q": "150 g"
      }
    ],
    "steps": "1. Passe sal em meia borda da taça margarita.\n2. Bata tequila, Triple Sec, limão, xarope e gelo no liquidificador até virar creme gelado.",
    "description": "Margarita em textura de sorbet gelado com borda de sal.",
    "story": "Imortalizada por Mariano Martinez em Dallas em 1971 ao adaptar uma máquina de sorvete para servir Margaritas congeladas.",
    "glass": "Taça Margarita",
    "technique": "Batido (blend)",
    "garnish": "Meia borda de sal e limão",
    "shaken": false,
    "tags": [
      "Clássico",
      "Frozen",
      "Cítrico / Ácido",
      "Tequila"
    ]
  },
  {
    "name": "Frozen Strawberry Margarita",
    "category": "Frozen",
    "ingredients": [
      {
        "n": "Tequila",
        "q": "50 ml (Prata)"
      },
      {
        "n": "Morango",
        "q": "5 unid"
      },
      {
        "n": "Triple Sec",
        "q": "20 ml"
      },
      {
        "n": "Limão",
        "q": "25 ml (Taiti)"
      },
      {
        "n": "Sal",
        "q": "na borda"
      },
      {
        "n": "Gelo",
        "q": "150 g"
      }
    ],
    "steps": "1. Bata tequila, morangos, Triple Sec, limão e bastante gelo no liquidificador.\n2. Sirva na taça margarita com borda de sal ou açúcar.",
    "description": "Sorbet rosado de morango com tequila e corte ácido de limão.",
    "story": "A variação mais fotogênica e pedida da Margarita Frozen em bares mexicanos e rooftops.",
    "glass": "Taça Margarita",
    "technique": "Batido (blend)",
    "garnish": "Morango e rodela de limão",
    "shaken": false,
    "tags": [
      "Frozen",
      "Frutado",
      "Doce",
      "Tequila"
    ]
  },
  {
    "name": "Miami Vice",
    "category": "Frozen",
    "ingredients": [
      {
        "n": "Rum",
        "q": "60 ml (Branco)"
      },
      {
        "n": "Morango",
        "q": "4 unid"
      },
      {
        "n": "Suco de abacaxi",
        "q": "60 ml"
      },
      {
        "n": "Creme de coco",
        "q": "30 ml"
      },
      {
        "n": "Limão",
        "q": "15 ml (Taiti)"
      },
      {
        "n": "Gelo",
        "q": "180 g"
      }
    ],
    "steps": "1. Bata metade do rum com suco de abacaxi, creme de coco e gelo (Piña Colada).\n2. Bata a outra metade com morangos, limão e gelo (Strawberry Daiquiri) e monte em camadas na taça.",
    "description": "Metade Piña Colada, metade Strawberry Daiquiri num visual bicolor icônico.",
    "story": "Nascido nas praias de Miami nos anos 1980 em homenagem à série policial homônima — impossível passar despercebido.",
    "glass": "Taça Hurricane",
    "technique": "Duplo blend em camadas",
    "garnish": "Morango e fatia de abacaxi",
    "shaken": false,
    "tags": [
      "Clássico",
      "Frozen",
      "Tropical",
      "Cremoso",
      "Rum"
    ]
  },
  {
    "name": "Frozen Aperol Spritz",
    "category": "Frozen",
    "ingredients": [
      {
        "n": "Aperol",
        "q": "50 ml"
      },
      {
        "n": "Prosecco",
        "q": "60 ml"
      },
      {
        "n": "Suco de laranja",
        "q": "40 ml"
      },
      {
        "n": "Xarope de açúcar",
        "q": "10 ml"
      },
      {
        "n": "Gelo",
        "q": "140 g"
      }
    ],
    "steps": "1. Bata Aperol, suco de laranja, xarope e gelo no liquidificador até textura slush.\n2. Despeje na taça e finalize com Prosecco gelado.",
    "description": "Versão raspadinha alaranjada do Aperol Spritz coroada com Prosecco.",
    "story": "Tendência dos verões europeus e rooftops modernos para refrescar os dias mais quentes.",
    "glass": "Taça de vinho",
    "technique": "Blend + top de Prosecco",
    "garnish": "Rodela de laranja",
    "shaken": false,
    "tags": [
      "Frozen",
      "Amargo",
      "Refrescante",
      "Vermute & Aperitivos"
    ]
  },
  {
    "name": "Frosé",
    "category": "Frozen",
    "ingredients": [
      {
        "n": "Espumante",
        "q": "120 ml (Rosé)"
      },
      {
        "n": "Morango",
        "q": "5 unid"
      },
      {
        "n": "Xarope de açúcar",
        "q": "20 ml"
      },
      {
        "n": "Limão",
        "q": "15 ml (Siciliano)"
      },
      {
        "n": "Gelo",
        "q": "140 g"
      }
    ],
    "steps": "1. Bata espumante ou vinho rosé gelado com morangos, xarope, limão siciliano e gelo no liquidificador.\n2. Sirva imediatamente em taça de vinho.",
    "description": "Slushie rosado de espumante ou vinho rosé com morangos e limão siciliano.",
    "story": "Criado no Bar Primi em Nova York em 2016 e viralizado como o drink oficial do verão internacional.",
    "glass": "Taça de vinho",
    "technique": "Batido (blend)",
    "garnish": "Morango fresco",
    "shaken": false,
    "tags": [
      "Clássico",
      "Frozen",
      "Frutado",
      "Refrescante"
    ]
  },
  {
    "name": "Frozen Mango Daiquiri",
    "category": "Frozen",
    "ingredients": [
      {
        "n": "Rum",
        "q": "50 ml (Branco)"
      },
      {
        "n": "Manga",
        "q": "120 g (madura)"
      },
      {
        "n": "Limão",
        "q": "20 ml (Taiti)"
      },
      {
        "n": "Xarope de açúcar",
        "q": "15 ml"
      },
      {
        "n": "Gelo",
        "q": "150 g"
      }
    ],
    "steps": "1. Bata rum branco, manga em cubos, limão, xarope e gelo no liquidificador até ficar liso e dourado.",
    "description": "Creme dourado e gelado de manga madura com rum branco e limão.",
    "story": "Clássico dos bares caribenhos que valoriza a textura naturalmente aveludada da manga.",
    "glass": "Taça Hurricane",
    "technique": "Batido (blend)",
    "garnish": "Fatia de manga e hortelã",
    "shaken": false,
    "tags": [
      "Frozen",
      "Tropical",
      "Frutado",
      "Rum"
    ]
  },
  {
    "name": "Lava Flow",
    "category": "Frozen",
    "ingredients": [
      {
        "n": "Rum",
        "q": "50 ml (Branco)"
      },
      {
        "n": "Morango",
        "q": "4 unid"
      },
      {
        "n": "Creme de coco",
        "q": "35 ml"
      },
      {
        "n": "Suco de abacaxi",
        "q": "60 ml"
      },
      {
        "n": "Gelo",
        "q": "160 g"
      }
    ],
    "steps": "1. Bata morangos com metade do rum no fundo da taça.\n2. Bata o restante do rum com abacaxi, creme de coco e gelo e despeje sobre a base vermelha para criar rios de lava.",
    "description": "Erupção havaiana de Piña Colada atravessada por veios vermelhos de morango.",
    "story": "Clássico dos resorts do Havaí onde a camada cremosa encontra o purê de morango formando efeito vulcânico.",
    "glass": "Taça Hurricane",
    "technique": "Blend em camadas",
    "garnish": "Abacaxi e guarda-chuva",
    "shaken": false,
    "tags": [
      "Frozen",
      "Tropical",
      "Cremoso",
      "Rum"
    ]
  },
  {
    "name": "Frozen Mudslide",
    "category": "Frozen",
    "ingredients": [
      {
        "n": "Vodka",
        "q": "30 ml"
      },
      {
        "n": "Licor de café",
        "q": "30 ml"
      },
      {
        "n": "Licor de creme (Baileys)",
        "q": "30 ml"
      },
      {
        "n": "Sorvete de baunilha",
        "q": "1 bola"
      },
      {
        "n": "Calda de chocolate",
        "q": "15 ml"
      },
      {
        "n": "Gelo",
        "q": "100 g"
      }
    ],
    "steps": "1. Bata vodka, licor de café, Baileys, sorvete de baunilha e gelo no liquidificador.\n2. Sirva em taça riscada com calda de chocolate.",
    "description": "Milkshake alcoólico indulgente de café, Baileys, vodka e sorvete.",
    "story": "Sobremesa icônica das casas praianas americanas desde os anos 1980.",
    "glass": "Taça Hurricane",
    "technique": "Batido (blend)",
    "garnish": "Calda de chocolate e chantilly",
    "shaken": false,
    "tags": [
      "Frozen",
      "Cremoso",
      "Doce",
      "Vodka"
    ]
  },
  {
    "name": "Red Bomb",
    "category": "Energéticos",
    "ingredients": [
      {
        "n": "Vodka",
        "q": "50 ml"
      },
      {
        "n": "Xarope de groselha",
        "q": "15 ml"
      },
      {
        "n": "Xarope de morango",
        "q": "10 ml"
      },
      {
        "n": "Limão",
        "q": "15 ml (Taiti)"
      },
      {
        "n": "Energético",
        "q": "120 ml"
      },
      {
        "n": "Gelo",
        "q": "cubos"
      }
    ],
    "steps": "1. Encha um copo alto com gelo.\n2. Adicione vodka, groselha, xarope de morango e limão e complete com energético gelado.",
    "description": "Explosão vermelha de pista unindo morango, groselha, limão e energético.",
    "story": "Hit de pista da Campos House feito para manter a cor rubi vibrante e o frescor cítrico.",
    "glass": "Copo alto",
    "technique": "Montado no copo",
    "garnish": "Morango ou rodela de limão",
    "shaken": false,
    "tags": [
      "Autoral",
      "Energético",
      "Frutado",
      "Vodka"
    ]
  },
  {
    "name": "Gin Energy Sunrise",
    "category": "Energéticos",
    "ingredients": [
      {
        "n": "Gin",
        "q": "50 ml"
      },
      {
        "n": "Suco de laranja",
        "q": "50 ml"
      },
      {
        "n": "Xarope de groselha",
        "q": "15 ml"
      },
      {
        "n": "Energético",
        "q": "100 ml"
      },
      {
        "n": "Gelo",
        "q": "cubos"
      }
    ],
    "steps": "1. Coloque gelo, gin, suco de laranja e energético no copo alto.\n2. Despeje groselha pela parede para formar efeito degradê.",
    "description": "Gin com suco de laranja, energético e fundo rubi solar.",
    "story": "Inspirado no Tequila Sunrise para virar um long drink de festa cheio de energia.",
    "glass": "Copo alto",
    "technique": "Montado em camadas",
    "garnish": "Rodela de laranja",
    "shaken": false,
    "tags": [
      "Autoral",
      "Energético",
      "Frutado",
      "Gin"
    ]
  },
  {
    "name": "Combustão Rubi",
    "category": "Energéticos",
    "ingredients": [
      {
        "n": "Vodka",
        "q": "45 ml"
      },
      {
        "n": "Energético",
        "q": "110 ml"
      },
      {
        "n": "Xarope de groselha",
        "q": "15 ml"
      },
      {
        "n": "Morango",
        "q": "1 unid"
      },
      {
        "n": "Gelo",
        "q": "cubos"
      }
    ],
    "steps": "1. Monte vodka e energético no copo alto com muito gelo.\n2. Despeje groselha e decore com morango.",
    "description": "Rubi brilhante e refrescante pensado para animar a pista.",
    "story": "Clássico direto de balada com visual escarlate marcante.",
    "glass": "Copo alto",
    "technique": "Montado no copo",
    "garnish": "Morango na borda",
    "shaken": false,
    "tags": [
      "Energético",
      "Doce",
      "Longo",
      "Vodka"
    ]
  },
  {
    "name": "Neon Verde",
    "category": "Energéticos",
    "ingredients": [
      {
        "n": "Vodka",
        "q": "45 ml"
      },
      {
        "n": "Energético",
        "q": "110 ml"
      },
      {
        "n": "Xarope de maçã verde",
        "q": "20 ml"
      },
      {
        "n": "Maçã",
        "q": "1 fatia"
      },
      {
        "n": "Gelo",
        "q": "cubos"
      }
    ],
    "steps": "1. Encha o copo alto com gelo.\n2. Adicione vodka e xarope de maçã verde e complete com energético.",
    "description": "Verde elétrico com acidez adocicada de maçã verde e energético.",
    "story": "Drink de pista com brilho verde inconfundível pronto com o estoque base.",
    "glass": "Copo alto",
    "technique": "Montado no copo",
    "garnish": "Fatia de maçã verde",
    "shaken": false,
    "tags": [
      "Energético",
      "Frutado",
      "Longo",
      "Vodka"
    ]
  },
  {
    "name": "Trovão Tropical",
    "category": "Energéticos",
    "ingredients": [
      {
        "n": "Rum",
        "q": "45 ml (Branco)"
      },
      {
        "n": "Energético",
        "q": "100 ml"
      },
      {
        "n": "Abacaxi",
        "q": "50 g"
      },
      {
        "n": "Maracujá",
        "q": "0.5 fruta"
      },
      {
        "n": "Gelo",
        "q": "cubos"
      }
    ],
    "steps": "1. Macere abacaxi e maracujá no fundo do copo.\n2. Encha de gelo, adicione rum e complete com energético.",
    "description": "Frutas tropicais maceradas turbinadas com rum e energético.",
    "story": "Energético frutado de verdade usando abacaxi e maracujá frescos.",
    "glass": "Copo alto",
    "technique": "Macerado + build",
    "garnish": "Fatia de abacaxi",
    "shaken": false,
    "tags": [
      "Energético",
      "Tropical",
      "Rum"
    ]
  },
  {
    "name": "Cavalo Marinho",
    "category": "Energéticos",
    "ingredients": [
      {
        "n": "Gin",
        "q": "45 ml"
      },
      {
        "n": "Energético",
        "q": "110 ml"
      },
      {
        "n": "Limão",
        "q": "15 ml (Siciliano)"
      },
      {
        "n": "Gelo",
        "q": "cubos"
      }
    ],
    "steps": "1. Encha o copo alto com gelo.\n2. Adicione gin, suco de limão siciliano e complete com energético.",
    "description": "Gin botânico com corte cítrico siciliano e energia vibrante.",
    "story": "Combinação limpa e refrescante para noites longas sem pesar no paladar.",
    "glass": "Copo alto",
    "technique": "Montado no copo",
    "garnish": "Rodela de limão siciliano",
    "shaken": false,
    "tags": [
      "Energético",
      "Cítrico / Ácido",
      "Gin"
    ]
  },
  {
    "name": "Raio Dourado",
    "category": "Energéticos",
    "ingredients": [
      {
        "n": "Cachaça",
        "q": "45 ml (Ouro)"
      },
      {
        "n": "Energético",
        "q": "110 ml"
      },
      {
        "n": "Xarope de gengibre",
        "q": "15 ml"
      },
      {
        "n": "Abacaxi",
        "q": "1 triângulo"
      },
      {
        "n": "Gelo",
        "q": "cubos"
      }
    ],
    "steps": "1. Encha o copo alto com gelo.\n2. Adicione cachaça ouro e xarope de gengibre e complete com energético.",
    "description": "Cachaça ouro com toque picante de gengibre e energético gelado.",
    "story": "Prova que cachaça amadeirada e gengibre formam um highball energético cheio de personalidade.",
    "glass": "Copo alto",
    "technique": "Montado no copo",
    "garnish": "Abacaxi",
    "shaken": false,
    "tags": [
      "Energético",
      "Picante / Gengibre",
      "Brasileiro",
      "Cachaça"
    ]
  },
  {
    "name": "Jägerbomb",
    "category": "Energéticos",
    "ingredients": [
      {
        "n": "Licor de ervas (Jägermeister)",
        "q": "45 ml"
      },
      {
        "n": "Energético",
        "q": "120 ml"
      }
    ],
    "steps": "1. Despeje o energético bem gelado em copo largo.\n2. Sirva o shot de Jägermeister ao lado (ou submerso no momento do brinde).",
    "description": "Clássico mundial de balada: licor alemão de 56 ervas e energético.",
    "story": "Presença obrigatória nas pistas europeias e americanas desde os anos 2000.",
    "glass": "Copo + Shot",
    "technique": "Bomb / Submerso",
    "garnish": "Sem guarnição",
    "shaken": false,
    "tags": [
      "Clássico",
      "Energético",
      "Herbal / Hortelã"
    ]
  },
  {
    "name": "B-52",
    "category": "Shots",
    "ingredients": [
      {
        "n": "Licor de café",
        "q": "15 ml"
      },
      {
        "n": "Licor de creme (Baileys)",
        "q": "15 ml"
      },
      {
        "n": "Cointreau",
        "q": "15 ml"
      }
    ],
    "steps": "1. Despeje licor de café no fundo do shot.\n2. Usando as costas de uma colher, flutue o Baileys no meio e o Cointreau no topo em três camadas distintas.",
    "description": "Shot em três camadas perfeitas: café, creme irlandês e laranja.",
    "story": "Criado em 1977 no Alice’s Restaurant em Malibu — batizado pelo avião B-52 e pela banda B-52’s.",
    "glass": "Shot",
    "technique": "Em camadas",
    "garnish": "Camadas definidas",
    "shaken": false,
    "tags": [
      "Clássico",
      "Shot",
      "Cremoso",
      "Doce"
    ]
  },
  {
    "name": "Green Tea Shot",
    "category": "Shots",
    "ingredients": [
      {
        "n": "Whisky",
        "q": "20 ml (Irish)"
      },
      {
        "n": "Licor de pêssego",
        "q": "20 ml"
      },
      {
        "n": "Limão",
        "q": "15 ml (Siciliano)"
      },
      {
        "n": "Xarope de açúcar",
        "q": "10 ml"
      },
      {
        "n": "Refrigerante de limão",
        "q": "15 ml"
      }
    ],
    "steps": "1. Bata whisky irlandês, licor de pêssego, limão e xarope com gelo.\n2. Coe para copo de shot e finalize com um splash de refrigerante de limão.",
    "description": "Não leva chá verde: whisky irlandês e pêssego com gosto surpreendente de chá gelado.",
    "story": "Criado nos bares da costa leste americana nos anos 2000 pela marca Jameson — o shot mais pedido dos EUA.",
    "glass": "Shot",
    "technique": "Shaker + splash",
    "garnish": "Espuma leve",
    "shaken": true,
    "tags": [
      "Clássico",
      "Shot",
      "Frutado",
      "Whisky"
    ]
  },
  {
    "name": "Kamikaze",
    "category": "Shots",
    "ingredients": [
      {
        "n": "Vodka",
        "q": "25 ml"
      },
      {
        "n": "Triple Sec",
        "q": "15 ml"
      },
      {
        "n": "Limão",
        "q": "15 ml (Taiti)"
      }
    ],
    "steps": "1. Bata vodka, Triple Sec e suco de limão fresco com bastante gelo.\n2. Coe bem gelado para o copo de shot.",
    "description": "Shot clássico ácido e afiado de vodka, laranja e limão.",
    "story": "Nascido nos anos 1970 e registrado no Boston Bartender’s Guide — direto ao ponto.",
    "glass": "Shot",
    "technique": "Shaker",
    "garnish": "Gomo opcional de limão",
    "shaken": true,
    "tags": [
      "Clássico",
      "Shot",
      "Cítrico / Ácido",
      "Vodka"
    ]
  },
  {
    "name": "Lemon Drop Shot",
    "category": "Shots",
    "ingredients": [
      {
        "n": "Vodka",
        "q": "30 ml"
      },
      {
        "n": "Limão",
        "q": "15 ml (Siciliano)"
      },
      {
        "n": "Açúcar",
        "q": "1 colher"
      }
    ],
    "steps": "1. Bata vodka, limão siciliano e um pouco de açúcar (ou xarope) com gelo.\n2. Coe no shot e sirva com fatia de limão açucarada.",
    "description": "Doce e ácido na medida certa, como uma bala de limão gelada.",
    "story": "Versão shot do famoso coquetel californiano dos anos 1970, perfeito com a fatia de limão açucarada após o gole.",
    "glass": "Shot",
    "technique": "Shaker",
    "garnish": "Fatia de limão polvilhada com açúcar",
    "shaken": true,
    "tags": [
      "Clássico",
      "Shot",
      "Cítrico / Ácido",
      "Vodka"
    ]
  },
  {
    "name": "Baby Guinness",
    "category": "Shots",
    "ingredients": [
      {
        "n": "Licor de café",
        "q": "30 ml"
      },
      {
        "n": "Licor de creme (Baileys)",
        "q": "15 ml"
      }
    ],
    "steps": "1. Encha dois terços do shot com licor de café.\n2. Flutue suavemente o Baileys sobre as costas de uma colher para parecer o colarinho de uma pint escura.",
    "description": "Miniatura visual de cerveja escura feita com café e creme irlandês.",
    "story": "Clássico dos pubs irlandeses e ingleses desde os anos 1980 pelo efeito visual idêntico ao pint da Guinness.",
    "glass": "Shot",
    "technique": "Em camadas",
    "garnish": "Colarinho cremoso",
    "shaken": false,
    "tags": [
      "Clássico",
      "Shot",
      "Cremoso",
      "Doce"
    ]
  },
  {
    "name": "Mexican Candy Shot",
    "category": "Shots",
    "ingredients": [
      {
        "n": "Tequila",
        "q": "25 ml (Prata)"
      },
      {
        "n": "Xarope de melancia",
        "q": "15 ml"
      },
      {
        "n": "Limão",
        "q": "10 ml (Taiti)"
      },
      {
        "n": "Pimenta",
        "q": "1 gota"
      },
      {
        "n": "Sal",
        "q": "na borda"
      }
    ],
    "steps": "1. Passe limão na borda do shot e encoste no sal com uma pitada de pimenta.\n2. Bata tequila, xarope de melancia, limão e gota de pimenta com gelo e coe.",
    "description": "Melancia doce, tequila, limão e ardor divertido inspirado nos doces mexicanos.",
    "story": "Hit nos bares texanos e mexicanos por replicar o famoso doce ácido-picante de melancia com chile.",
    "glass": "Shot",
    "technique": "Shaker",
    "garnish": "Borda salgada apimentada",
    "shaken": true,
    "tags": [
      "Shot",
      "Picante / Gengibre",
      "Frutado",
      "Tequila"
    ]
  },
  {
    "name": "White Tea Shot",
    "category": "Shots",
    "ingredients": [
      {
        "n": "Vodka",
        "q": "20 ml"
      },
      {
        "n": "Licor de pêssego",
        "q": "20 ml"
      },
      {
        "n": "Limão",
        "q": "15 ml (Siciliano)"
      },
      {
        "n": "Xarope de açúcar",
        "q": "10 ml"
      },
      {
        "n": "Refrigerante de limão",
        "q": "15 ml"
      }
    ],
    "steps": "1. Bata vodka, licor de pêssego, limão siciliano e xarope com gelo.\n2. Coe no shot e finalize com um fio de refrigerante de limão.",
    "description": "Irmão suave do Green Tea Shot feito com vodka, pêssego e siciliano.",
    "story": "Alternativa leve e frutada ao Green Tea Shot para quem prefere vodka ao whisky.",
    "glass": "Shot",
    "technique": "Shaker + splash",
    "garnish": "Sem guarnição",
    "shaken": true,
    "tags": [
      "Shot",
      "Frutado",
      "Vodka"
    ]
  },
  {
    "name": "Scooby Snack",
    "category": "Shots",
    "ingredients": [
      {
        "n": "Licor de melão",
        "q": "15 ml"
      },
      {
        "n": "Licor de coco",
        "q": "15 ml"
      },
      {
        "n": "Suco de abacaxi",
        "q": "15 ml"
      },
      {
        "n": "Creme de leite",
        "q": "10 ml"
      }
    ],
    "steps": "1. Bata todos os ingredientes com gelo na coqueteleira.\n2. Coe no shot bem cremoso e verde-claro.",
    "description": "Shot cremoso verde-menta com sabor tropical de melão, coco e abacaxi.",
    "story": "Clássico divertido das casas de festa americanas pelo sabor que lembra sobremesa tropical.",
    "glass": "Shot",
    "technique": "Shaker",
    "garnish": "Chantilly opcional",
    "shaken": true,
    "tags": [
      "Shot",
      "Cremoso",
      "Tropical",
      "Doce"
    ]
  },
  {
    "name": "Cometa Rubi",
    "category": "Shots",
    "ingredients": [
      {
        "n": "Vodka",
        "q": "30 ml"
      },
      {
        "n": "Xarope de groselha",
        "q": "10 ml"
      },
      {
        "n": "Limão",
        "q": "10 ml (Taiti)"
      }
    ],
    "steps": "1. Bata vodka, groselha e limão com gelo até congelar.\n2. Coe rápido para o shot.",
    "description": "Vermelho vivo, gelado e ácido-doce com passagem limpa.",
    "story": "Shot assinatura da casa para brindes rápidos usando o estoque básico.",
    "glass": "Shot",
    "technique": "Shaker",
    "garnish": "Sem guarnição",
    "shaken": true,
    "tags": [
      "Shot",
      "Frutado",
      "Vodka"
    ]
  },
  {
    "name": "Dragão Verde",
    "category": "Shots",
    "ingredients": [
      {
        "n": "Vodka",
        "q": "30 ml"
      },
      {
        "n": "Xarope de maçã verde",
        "q": "15 ml"
      },
      {
        "n": "Limão",
        "q": "10 ml (Siciliano)"
      }
    ],
    "steps": "1. Bata vodka, xarope de maçã verde e limão siciliano com gelo.\n2. Coe no copo de shot.",
    "description": "Esmeralda vibrante, cítrico e refrescante em um gole só.",
    "story": "Shot de cor impactante que contrasta acidez de limão siciliano com maçã verde.",
    "glass": "Shot",
    "technique": "Shaker",
    "garnish": "Sem guarnição",
    "shaken": true,
    "tags": [
      "Shot",
      "Cítrico / Ácido",
      "Vodka"
    ]
  },
  {
    "name": "Sangria Espanhola",
    "category": "Jarras",
    "ingredients": [
      {
        "n": "Vinho tinto",
        "q": "500 ml"
      },
      {
        "n": "Conhaque",
        "q": "90 ml"
      },
      {
        "n": "Suco de laranja",
        "q": "150 ml"
      },
      {
        "n": "Laranja",
        "q": "1 unid fatiada"
      },
      {
        "n": "Maçã",
        "q": "1 unid em cubos"
      },
      {
        "n": "Limão",
        "q": "1 unid fatiada"
      },
      {
        "n": "Água com gás",
        "q": "200 ml"
      },
      {
        "n": "Gelo",
        "q": "bastante"
      }
    ],
    "steps": "1. Coloque as frutas fatiadas na jarra com vinho tinto, conhaque e suco de laranja.\n2. Deixe descansar gelado, adicione bastante gelo e complete com água com gás na hora de servir.",
    "description": "Jarra clássica ibérica de vinho tinto, conhaque e frutas frescas.",
    "story": "Tradição da Península Ibérica reconhecida mundialmente como o drink de mesa mais festivo de todos.",
    "glass": "Jarra 1,2 L",
    "technique": "Montado na jarra",
    "garnish": "Frutas fatiadas e canela em pau",
    "shaken": false,
    "tags": [
      "Clássico",
      "Para dividir (Jarra)",
      "Frutado",
      "Conhaque",
      "Vermute & Aperitivos"
    ]
  },
  {
    "name": "Clericot",
    "category": "Jarras",
    "ingredients": [
      {
        "n": "Vinho branco",
        "q": "400 ml"
      },
      {
        "n": "Espumante",
        "q": "250 ml (Brut)"
      },
      {
        "n": "Cointreau",
        "q": "60 ml"
      },
      {
        "n": "Morango",
        "q": "6 unid"
      },
      {
        "n": "Abacaxi",
        "q": "120 g"
      },
      {
        "n": "Uva",
        "q": "10 bagos"
      },
      {
        "n": "Maçã",
        "q": "0.5 unid"
      },
      {
        "n": "Gelo",
        "q": "bastante"
      }
    ],
    "steps": "1. Disponha todas as frutas picadas na jarra com gelo.\n2. Despeje Cointreau e vinho branco gelado e complete com espumante antes de levar à mesa.",
    "description": "Jarra elegante e colorida de vinho branco, espumante, Cointreau e frutas.",
    "story": "Clássico de verão do Cone Sul (Uruguai, Argentina e Sul do Brasil) que brilha em almoços ao ar livre.",
    "glass": "Jarra 1,2 L",
    "technique": "Montado na jarra",
    "garnish": "Frutas frescas e hortelã",
    "shaken": false,
    "tags": [
      "Clássico",
      "Para dividir (Jarra)",
      "Frutado",
      "Refrescante"
    ]
  },
  {
    "name": "Aperol Spritz na Jarra",
    "category": "Jarras",
    "ingredients": [
      {
        "n": "Aperol",
        "q": "240 ml"
      },
      {
        "n": "Prosecco",
        "q": "360 ml"
      },
      {
        "n": "Água com gás",
        "q": "120 ml"
      },
      {
        "n": "Laranja",
        "q": "1 unid em rodelas"
      },
      {
        "n": "Gelo",
        "q": "bastante"
      }
    ],
    "steps": "1. Encha uma jarra grande com cubos de gelo e rodelas de laranja.\n2. Despeje Prosecco, Aperol e água com gás e mexa suavemente.",
    "description": "O aperitivo italiano favorito servido em jarra para quatro brindes.",
    "story": "Ideal para mesas compartilhadas no happy hour sem perder a proporção exata 3-2-1.",
    "glass": "Jarra 1 L",
    "technique": "Montado na jarra",
    "garnish": "Rodelas de laranja",
    "shaken": false,
    "tags": [
      "Clássico",
      "Para dividir (Jarra)",
      "Amargo",
      "Vermute & Aperitivos"
    ]
  },
  {
    "name": "Jarra de Mojito",
    "category": "Jarras",
    "ingredients": [
      {
        "n": "Rum",
        "q": "250 ml (Branco)"
      },
      {
        "n": "Hortelã",
        "q": "35 folhas"
      },
      {
        "n": "Limão",
        "q": "100 ml (Taiti)"
      },
      {
        "n": "Xarope de açúcar",
        "q": "90 ml"
      },
      {
        "n": "Água com gás",
        "q": "450 ml"
      },
      {
        "n": "Gelo",
        "q": "bastante"
      }
    ],
    "steps": "1. Pressione suavemente a hortelã com limão e xarope no fundo da jarra.\n2. Encha de gelo, adicione rum branco e complete com água com gás.",
    "description": "Mojito fresco preparado em jarra para dividir com a mesa inteira.",
    "story": "Perfeita para grupos que querem frescor cubano contínuo direto do centro da mesa.",
    "glass": "Jarra 1,2 L",
    "technique": "Macerado suave + jarra",
    "garnish": "Ramos grandes de hortelã e limão",
    "shaken": false,
    "tags": [
      "Para dividir (Jarra)",
      "Refrescante",
      "Herbal / Hortelã",
      "Rum"
    ]
  },
  {
    "name": "Jarra de Caipirinha",
    "category": "Jarras",
    "ingredients": [
      {
        "n": "Cachaça",
        "q": "250 ml (Prata)"
      },
      {
        "n": "Limão",
        "q": "5 unid (Taiti)"
      },
      {
        "n": "Açúcar",
        "q": "8 colheres"
      },
      {
        "n": "Gelo",
        "q": "bastante"
      }
    ],
    "steps": "1. Macere os limões em gomos com açúcar na base da jarra.\n2. Adicione bastante gelo, cachaça prata e misture vigorosamente.",
    "description": "Cinco doses de caipirinha tradicional gelada no centro da mesa.",
    "story": "A estrela dos churrascos e encontros brasileiros para servir toda a turma de uma vez.",
    "glass": "Jarra 1 L",
    "technique": "Macerado na jarra",
    "garnish": "Rodelas de limão",
    "shaken": false,
    "tags": [
      "Para dividir (Jarra)",
      "Brasileiro",
      "Cítrico / Ácido",
      "Cachaça"
    ]
  },
  {
    "name": "Jarra de Moscow Mule",
    "category": "Jarras",
    "ingredients": [
      {
        "n": "Vodka",
        "q": "250 ml"
      },
      {
        "n": "Xarope de gengibre",
        "q": "120 ml"
      },
      {
        "n": "Limão",
        "q": "90 ml (Taiti)"
      },
      {
        "n": "Água com gás",
        "q": "450 ml"
      },
      {
        "n": "Hortelã",
        "q": "12 folhas"
      },
      {
        "n": "Gelo",
        "q": "bastante"
      }
    ],
    "steps": "1. Encha uma jarra grande com gelo.\n2. Adicione vodka, xarope de gengibre e limão, complete com água com gás e decore com hortelã.",
    "description": "Picância refrescante de gengibre e vodka para brindar em grupo.",
    "story": "Versão compartilhada do queridinho das noites brasileiras.",
    "glass": "Jarra 1,2 L",
    "technique": "Montado na jarra",
    "garnish": "Hortelã e rodelas de limão",
    "shaken": false,
    "tags": [
      "Para dividir (Jarra)",
      "Picante / Gengibre",
      "Refrescante",
      "Vodka"
    ]
  },
  {
    "name": "Jarra Tropical da Casa",
    "category": "Jarras",
    "ingredients": [
      {
        "n": "Rum",
        "q": "220 ml (Branco)"
      },
      {
        "n": "Maracujá",
        "q": "3 frutas"
      },
      {
        "n": "Abacaxi",
        "q": "180 g"
      },
      {
        "n": "Xarope de groselha",
        "q": "50 ml"
      },
      {
        "n": "Limão",
        "q": "70 ml (Taiti)"
      },
      {
        "n": "Água com gás",
        "q": "350 ml"
      },
      {
        "n": "Gelo",
        "q": "bastante"
      }
    ],
    "steps": "1. Macere abacaxi e maracujá na base da jarra.\n2. Adicione gelo, rum, groselha e limão e complete com água com gás.",
    "description": "Explosão rubi de maracujá, abacaxi e rum para dividir com até 6 pessoas.",
    "story": "Criação de mesa da Campos House colorida, frutada e 100% pronta com o estoque base.",
    "glass": "Jarra 1,2 L",
    "technique": "Macerado + jarra",
    "garnish": "Frutas tropicais e hortelã",
    "shaken": false,
    "tags": [
      "Autoral",
      "Para dividir (Jarra)",
      "Tropical",
      "Frutado",
      "Rum"
    ]
  },
  {
    "name": "Virgin Mojito",
    "category": "Sem álcool",
    "ingredients": [
      {
        "n": "Hortelã",
        "q": "10 folhas"
      },
      {
        "n": "Limão",
        "q": "25 ml (Taiti)"
      },
      {
        "n": "Xarope de açúcar",
        "q": "20 ml"
      },
      {
        "n": "Água com gás",
        "q": "140 ml"
      },
      {
        "n": "Gelo",
        "q": "cubos"
      }
    ],
    "steps": "1. Pressione suavemente a hortelã com suco de limão e xarope no copo alto.\n2. Encha com gelo e complete com água com gás.",
    "description": "Todo o frescor herbal e cítrico do Mojito cubano sem uma gota de álcool.",
    "story": "O mocktail mais pedido do mundo em bares e restaurantes de todas as faixas etárias.",
    "glass": "Copo alto",
    "technique": "Macerado suave + build",
    "garnish": "Buquê de hortelã e rodela de limão",
    "shaken": false,
    "tags": [
      "Clássico",
      "Sem álcool",
      "Refrescante",
      "Herbal / Hortelã"
    ]
  },
  {
    "name": "Virgin Piña Colada",
    "category": "Sem álcool",
    "ingredients": [
      {
        "n": "Suco de abacaxi",
        "q": "110 ml"
      },
      {
        "n": "Leite de coco",
        "q": "50 ml"
      },
      {
        "n": "Creme de leite",
        "q": "25 ml"
      },
      {
        "n": "Abacaxi",
        "q": "1 fatia"
      },
      {
        "n": "Gelo",
        "q": "120 g"
      }
    ],
    "steps": "1. Bata suco de abacaxi, leite de coco, creme de leite e gelo no liquidificador.\n2. Sirva cremoso em taça hurricane.",
    "description": "Cremosidade tropical intacta de abacaxi e coco em versão zero álcool.",
    "story": "Popular em toda praia e hotel por entregar a experiência completa da Piña Colada sem álcool.",
    "glass": "Taça Hurricane",
    "technique": "Batido (blend)",
    "garnish": "Fatia de abacaxi e cereja",
    "shaken": false,
    "tags": [
      "Clássico",
      "Sem álcool",
      "Tropical",
      "Cremoso"
    ]
  },
  {
    "name": "Shirley Temple",
    "category": "Sem álcool",
    "ingredients": [
      {
        "n": "Ginger ale",
        "q": "150 ml"
      },
      {
        "n": "Grenadine",
        "q": "20 ml"
      },
      {
        "n": "Limão",
        "q": "10 ml (Taiti)"
      },
      {
        "n": "Cereja",
        "q": "1 unid"
      },
      {
        "n": "Gelo",
        "q": "cubos"
      }
    ],
    "steps": "1. Encha um copo alto com gelo.\n2. Despeje ginger ale (ou refrigerante de limão) e gotas de limão e finalize com grenadine.",
    "description": "Mocktail clássico de Hollywood doce, brilhante e gaseificado.",
    "story": "Criado nos anos 1930 no restaurante Chasen’s em Beverly Hills para a atriz mirim Shirley Temple.",
    "glass": "Copo alto",
    "technique": "Montado no copo",
    "garnish": "Cereja e fatia de laranja",
    "shaken": false,
    "tags": [
      "Clássico",
      "Sem álcool",
      "Doce",
      "Refrescante"
    ]
  },
  {
    "name": "Arnold Palmer",
    "category": "Sem álcool",
    "ingredients": [
      {
        "n": "Chá",
        "q": "100 ml (preto gelado)"
      },
      {
        "n": "Limão",
        "q": "30 ml (Siciliano)"
      },
      {
        "n": "Xarope de açúcar",
        "q": "20 ml"
      },
      {
        "n": "Gelo",
        "q": "cubos"
      }
    ],
    "steps": "1. Prepare chá preto forte e deixe esfriar.\n2. Sirva em copo alto com gelo em partes iguais com limonada siciliana fresca.",
    "description": "Meio chá gelado, meio limonada fresca — equilíbrio seco e revigorante.",
    "story": "Batizado nos anos 1960 em homenagem ao lendário golfista Arnold Palmer, que sempre pedia essa mistura após os torneios.",
    "glass": "Copo alto",
    "technique": "Montado no copo",
    "garnish": "Rodela de limão siciliano",
    "shaken": false,
    "tags": [
      "Clássico",
      "Sem álcool",
      "Refrescante",
      "Cítrico / Ácido"
    ]
  },
  {
    "name": "Pink Lemonade",
    "category": "Sem álcool",
    "ingredients": [
      {
        "n": "Limão",
        "q": "30 ml (Siciliano)"
      },
      {
        "n": "Morango",
        "q": "3 unid"
      },
      {
        "n": "Xarope de groselha",
        "q": "15 ml"
      },
      {
        "n": "Água com gás",
        "q": "130 ml"
      },
      {
        "n": "Gelo",
        "q": "cubos"
      }
    ],
    "steps": "1. Macere os morangos com groselha e suco de limão siciliano.\n2. Coe para copo alto com gelo e complete com água com gás.",
    "description": "Limonada rosa borbulhante com morangos frescos e limão siciliano.",
    "story": "Clássico americano de verão desde o século XIX que virou febre nas hamburguerias e bares modernos.",
    "glass": "Copo alto",
    "technique": "Macerado + build",
    "garnish": "Morango e rodela de limão siciliano",
    "shaken": false,
    "tags": [
      "Clássico",
      "Sem álcool",
      "Cítrico / Ácido",
      "Frutado"
    ]
  },
  {
    "name": "Limonada Suíça",
    "category": "Sem álcool",
    "ingredients": [
      {
        "n": "Limão",
        "q": "2 unid (Taiti com casca limpa)"
      },
      {
        "n": "Leite condensado",
        "q": "45 ml"
      },
      {
        "n": "Açúcar",
        "q": "1 colher"
      },
      {
        "n": "Gelo",
        "q": "150 g"
      }
    ],
    "steps": "1. Bata rapidamente no liquidificador (10s) os limões cortados em 4 com água gelada e coe na hora.\n2. Volte ao liquidificador com leite condensado e gelo e bata até espumar.",
    "description": "A limonada cremosa brasileira batida com casca e leite condensado.",
    "story": "Apesar do nome europeu, é criação genuinamente brasileira presente nos melhores bares e restaurantes do país.",
    "glass": "Copo alto",
    "technique": "Batido rápido",
    "garnish": "Rodela de limão",
    "shaken": false,
    "tags": [
      "Clássico",
      "Sem álcool",
      "Brasileiro",
      "Cremoso",
      "Cítrico / Ácido"
    ]
  },
  {
    "name": "Safe Sex on the Beach",
    "category": "Sem álcool",
    "ingredients": [
      {
        "n": "Suco de laranja",
        "q": "80 ml"
      },
      {
        "n": "Suco de cranberry",
        "q": "60 ml"
      },
      {
        "n": "Xarope de pêssego",
        "q": "25 ml"
      },
      {
        "n": "Gelo",
        "q": "cubos"
      }
    ],
    "steps": "1. Encha um copo alto com gelo.\n2. Adicione suco de laranja e xarope de pêssego e finalize com cranberry por cima.",
    "description": "Todo o sabor praiano do Sex on the Beach em versão 100% zero álcool.",
    "story": "Presença garantida em cartas familiares e motoristas da rodada desde os anos 1990.",
    "glass": "Copo alto",
    "technique": "Montado no copo",
    "garnish": "Rodela de laranja e cereja",
    "shaken": false,
    "tags": [
      "Clássico",
      "Sem álcool",
      "Frutado",
      "Doce"
    ]
  },
  {
    "name": "Soda Italiana de Maçã Verde",
    "category": "Sem álcool",
    "ingredients": [
      {
        "n": "Xarope de maçã verde",
        "q": "35 ml"
      },
      {
        "n": "Água com gás",
        "q": "150 ml"
      },
      {
        "n": "Limão",
        "q": "10 ml (Siciliano)"
      },
      {
        "n": "Gelo",
        "q": "cubos"
      }
    ],
    "steps": "1. Coloque o xarope de maçã verde no fundo do copo alto com gelo.\n2. Adicione algumas gotas de limão e complete devagar com água com gás.",
    "description": "Refrescante, cristalina e bicolor com acidez suave de maçã verde.",
    "story": "Sucesso das cafeterias e bares italianos — visual marcante sem álcool.",
    "glass": "Copo alto",
    "technique": "Montado em camadas",
    "garnish": "Fatia fina de maçã verde",
    "shaken": false,
    "tags": [
      "Sem álcool",
      "Refrescante",
      "Com soda / Tônica"
    ]
  },
  {
    "name": "Soda Italiana de Morango",
    "category": "Sem álcool",
    "ingredients": [
      {
        "n": "Xarope de morango",
        "q": "35 ml"
      },
      {
        "n": "Água com gás",
        "q": "150 ml"
      },
      {
        "n": "Limão",
        "q": "10 ml (Taiti)"
      },
      {
        "n": "Gelo",
        "q": "cubos"
      }
    ],
    "steps": "1. Coloque o xarope de morango no fundo do copo alto cheio de gelo.\n2. Complete delicadamente com água com gás e gotas de limão.",
    "description": "Soda rubi brilhante e refrescante de morango com borbulhas.",
    "story": "Clássico das cartas sem álcool pelo visual em duas camadas que pede foto antes do primeiro gole.",
    "glass": "Copo alto",
    "technique": "Montado em camadas",
    "garnish": "Morango na borda",
    "shaken": false,
    "tags": [
      "Sem álcool",
      "Frutado",
      "Doce",
      "Com soda / Tônica"
    ]
  },
  {
    "name": "Jardim Secreto",
    "category": "Sem álcool",
    "ingredients": [
      {
        "n": "Hortelã",
        "q": "8 folhas"
      },
      {
        "n": "Limão",
        "q": "20 ml (Siciliano)"
      },
      {
        "n": "Xarope de açúcar",
        "q": "15 ml"
      },
      {
        "n": "Água tônica",
        "q": "120 ml"
      },
      {
        "n": "Gelo",
        "q": "cubos"
      }
    ],
    "steps": "1. Macere levemente a hortelã com limão siciliano e xarope.\n2. Bata com gelo e coe sobre gelo novo completando com água tônica.",
    "description": "Mocktail botânico e herbal com amargor elegante de água tônica.",
    "story": "Pensado na casa para quem quer experiência adulta de Gin Tônica sem álcool.",
    "glass": "Taça balão",
    "technique": "Shaker + tônica",
    "garnish": "Ramo de hortelã e casca de limão",
    "shaken": true,
    "tags": [
      "Autoral",
      "Sem álcool",
      "Herbal / Hortelã",
      "Com soda / Tônica"
    ]
  },
  {
    "name": "Pôr do Sol Zero",
    "category": "Sem álcool",
    "ingredients": [
      {
        "n": "Maracujá",
        "q": "1 fruta"
      },
      {
        "n": "Xarope de groselha",
        "q": "20 ml"
      },
      {
        "n": "Limão",
        "q": "10 ml (Taiti)"
      },
      {
        "n": "Água com gás",
        "q": "120 ml"
      },
      {
        "n": "Gelo",
        "q": "cubos"
      }
    ],
    "steps": "1. Coloque gelo, polpa de maracujá e limão no copo alto.\n2. Complete com água com gás e despeje groselha por último para assentar no fundo.",
    "description": "Degradê dourado e vermelho de maracujá e groselha zero álcool.",
    "story": "Traz o visual vibrante do Tequila Sunrise sem álcool usando frutas do estoque.",
    "glass": "Copo alto",
    "technique": "Montado em camadas",
    "garnish": "Casca de laranja ou maracujá",
    "shaken": false,
    "tags": [
      "Autoral",
      "Sem álcool",
      "Tropical",
      "Refrescante"
    ]
  },
  {
    "name": "Gin Sour",
    "category": "Clássicos",
    "ingredients": [
      { "n": "Gin", "q": "60 ml (London Dry)" },
      { "n": "Limão", "q": "25 ml (Siciliano)" },
      { "n": "Xarope de açúcar", "q": "20 ml" },
      { "n": "Gelo", "q": "cubos" }
    ],
    "steps": "1. Bata gin, suco de limão siciliano e xarope de açúcar na coqueteleira com bastante gelo por 12 segundos.\n2. Faça dupla coagem para uma taça coupe gelada.\n3. Decore com casca de limão torcida por cima.",
    "description": "Clássico inglês do século XIX: gin botânico equilibrado com acidez cítrica viva.",
    "story": "Um dos pilares originais da família dos Sours no guia de Jerry Thomas de 1862, provando que três ingredientes precisos bastam para a perfeição.",
    "glass": "Taça coupe",
    "technique": "Shaker + double strain",
    "garnish": "Twist de limão siciliano",
    "shaken": true,
    "tags": ["Clássico", "Cítrico / Ácido", "Curto", "Gin"]
  },
  {
    "name": "Vodka Sour",
    "category": "Clássicos",
    "ingredients": [
      { "n": "Vodka", "q": "60 ml" },
      { "n": "Limão", "q": "25 ml (Siciliano)" },
      { "n": "Xarope de açúcar", "q": "20 ml" },
      { "n": "Gelo", "q": "cubos" }
    ],
    "steps": "1. Coloque vodka, limão siciliano e xarope de açúcar na coqueteleira com gelo.\n2. Agite com vigor por 12 segundos até gelar a lata.\n3. Coe duplamente em copo baixo com pedra de gelo ou taça gelada.",
    "description": "Limpo, brilhante e refrescante: vodka gelada com limão siciliano e doçura medida.",
    "story": "A porta de entrada cristalina para os coquetéis cítricos clássicos: zero amargor, textura sedosa e final seco.",
    "glass": "Copo baixo",
    "technique": "Shaker + double strain",
    "garnish": "Rodelinha fina de limão",
    "shaken": true,
    "tags": ["Clássico", "Cítrico / Ácido", "Curto", "Vodka"]
  },
  {
    "name": "Rum Sour",
    "category": "Cítricos",
    "ingredients": [
      { "n": "Rum", "q": "60 ml (Carta Branca)" },
      { "n": "Limão", "q": "25 ml (Taiti)" },
      { "n": "Xarope de açúcar", "q": "20 ml" },
      { "n": "Gelo", "q": "cubos" }
    ],
    "steps": "1. Agite rum branco, limão taiti fresco e xarope de açúcar com gelo por 12 segundos.\n2. Coe sobre gelo novo em copo baixo.\n3. Finalize com casca de limão aromática.",
    "description": "Primo caribenho do Daiquiri servido on the rocks: direto, cítrico e vibrante.",
    "story": "Herdeiro direto das rações navais britânicas de rum e limão que deram origem aos sours tropicais do Caribe.",
    "glass": "Copo baixo",
    "technique": "Shaker",
    "garnish": "Fatia de limão taiti",
    "shaken": true,
    "tags": ["Clássico", "Cítrico / Ácido", "Curto", "Rum"]
  },
  {
    "name": "Gin Buck",
    "category": "Clássicos",
    "ingredients": [
      { "n": "Gin", "q": "50 ml (London Dry)" },
      { "n": "Limão", "q": "15 ml (Taiti)" },
      { "n": "Xarope de gengibre", "q": "20 ml" },
      { "n": "Água com gás", "q": "100 ml" },
      { "n": "Gelo", "q": "cubos" }
    ],
    "steps": "1. Encha um copo alto com gelo bem frio.\n2. Adicione o gin, o limão taiti e o xarope de gengibre.\n3. Complete com água com gás e dê uma mexida suave de baixo para cima.",
    "description": "Highball histórico de 1900 que antecedeu o Moscow Mule: gin botânico com gengibre picante.",
    "story": "Popularizado nos clubes americanos no início do século XX, o termo Buck designava todo destilado combinado com cítrico e gengibre gaseificado.",
    "glass": "Copo alto",
    "technique": "Montado no copo (build)",
    "garnish": "Cunha de limão e lâmina de gengibre",
    "shaken": false,
    "tags": ["Clássico", "Picante / Gengibre", "Com soda / Tônica", "Longo", "Gin"]
  },
  {
    "name": "Rum Buck",
    "category": "Clássicos",
    "ingredients": [
      { "n": "Rum", "q": "50 ml (Carta Branca)" },
      { "n": "Limão", "q": "20 ml (Taiti)" },
      { "n": "Xarope de gengibre", "q": "20 ml" },
      { "n": "Água com gás", "q": "100 ml" },
      { "n": "Gelo", "q": "cubos" }
    ],
    "steps": "1. Em copo alto com bastante gelo, despeje o rum, o suco de limão e o xarope de gengibre.\n2. Complete com água com gás gelada e misture gentilmente.\n3. Decore com limão fresco na borda.",
    "description": "Versão leve e efervescente do Buck clássico com rum branco e gengibre vibrante.",
    "story": "Precursor direto do Dark 'n' Stormy das Bermudas, mantendo o protagonismo do gengibre fresco e da leveza efervescente.",
    "glass": "Copo alto",
    "technique": "Montado no copo (build)",
    "garnish": "Meia rodela de limão",
    "shaken": false,
    "tags": ["Clássico", "Picante / Gengibre", "Com soda / Tônica", "Longo", "Rum"]
  },
  {
    "name": "Brandy Fizz",
    "category": "Clássicos",
    "ingredients": [
      { "n": "Conhaque", "q": "50 ml" },
      { "n": "Limão", "q": "25 ml (Siciliano)" },
      { "n": "Xarope de açúcar", "q": "20 ml" },
      { "n": "Água com gás", "q": "90 ml" },
      { "n": "Gelo", "q": "cubos" }
    ],
    "steps": "1. Bata conhaque, limão siciliano e xarope de açúcar com gelo até esfriar bem.\n2. Coe para um copo alto sem gelo (ou com pouco gelo) e complete com água com gás.\n3. Sirva imediatamente enquanto borbulha.",
    "description": "Conhaque aveludado elevado por bolhas cítricas no estilo clássico de Nova Orleans.",
    "story": "Receita tradicional dos grandes hotéis do final do século XIX que transformou destilados amadeirados em refrescos matinais elegantes.",
    "glass": "Copo alto",
    "technique": "Shaker + build",
    "garnish": "Casca de limão siciliano",
    "shaken": true,
    "tags": ["Clássico", "Cítrico / Ácido", "Com soda / Tônica", "Conhaque"]
  },
  {
    "name": "Brandy Collins",
    "category": "Clássicos",
    "ingredients": [
      { "n": "Conhaque", "q": "50 ml" },
      { "n": "Limão", "q": "25 ml (Siciliano)" },
      { "n": "Xarope de açúcar", "q": "20 ml" },
      { "n": "Água com gás", "q": "110 ml" },
      { "n": "Gelo", "q": "cubos" }
    ],
    "steps": "1. Bata conhaque, limão e xarope de açúcar com gelo.\n2. Coe sobre um copo Collins cheio de gelo novo.\n3. Complete com água com gás e mexa uma única vez.",
    "description": "Primo amadeirado do Tom Collins: longo, refrescante e com notas quentes de conhaque.",
    "story": "Descendente direto da família Collins registrada por Harry Johnson em 1882, pensado para longas noites quentes de verão.",
    "glass": "Copo Collins",
    "technique": "Shaker + build",
    "garnish": "Rodela de limão",
    "shaken": true,
    "tags": ["Clássico", "Refrescante", "Com soda / Tônica", "Longo", "Conhaque"]
  },
  {
    "name": "Brandy Highball",
    "category": "Fortes",
    "ingredients": [
      { "n": "Conhaque", "q": "50 ml" },
      { "n": "Refrigerante de limão", "q": "110 ml" },
      { "n": "Limão", "q": "10 ml (Taiti)" },
      { "n": "Gelo", "q": "cubos" }
    ],
    "steps": "1. Encha um copo alto com cubos de gelo cristalinos.\n2. Despeje o conhaque e o suco de limão espremido na hora.\n3. Complete com refrigerante de limão bem gelado e misture de leve.",
    "description": "Clássico descomplicado de bistrô europeu: conhaque macio com cítrico gaseificado.",
    "story": "Muito pedido nos cafés franceses e ingleses desde os anos 1920 como alternativa leve ao conhaque puro após o jantar.",
    "glass": "Copo alto",
    "technique": "Montado no copo (build)",
    "garnish": "Casca de limão",
    "shaken": false,
    "tags": ["Clássico", "Com soda / Tônica", "Longo", "Conhaque"]
  },
  {
    "name": "Vermouth Tonic",
    "category": "Aperitivos",
    "ingredients": [
      { "n": "Vermute", "q": "60 ml (Tinto)" },
      { "n": "Água tônica", "q": "100 ml" },
      { "n": "Limão", "q": "15 ml (Siciliano)" },
      { "n": "Gelo", "q": "cubos" }
    ],
    "steps": "1. Gele uma taça ou copo baixo largo com bastante gelo.\n2. Adicione o vermute tinto e um toque de limão siciliano.\n3. Complete com água tônica gelada e mexa delicadamente.",
    "description": "Aperitivo europeu elegante: ervas e especiarias do vermute tinto cortadas pela tônica.",
    "story": "Rito sagrado da hora do vermú em Madri, Barcelona e Turim antes do jantar, leve em teor alcoólico e rico em botânicos.",
    "glass": "Taça balão",
    "technique": "Montado no copo (build)",
    "garnish": "Meia rodela de limão siciliano",
    "shaken": false,
    "tags": ["Clássico", "Amargo", "Com soda / Tônica", "Vermute & Aperitivos"]
  },
  {
    "name": "Vermouth Spritz",
    "category": "Aperitivos",
    "ingredients": [
      { "n": "Vermute", "q": "60 ml (Tinto)" },
      { "n": "Água com gás", "q": "90 ml" },
      { "n": "Limão", "q": "10 ml (Siciliano)" },
      { "n": "Gelo", "q": "cubos" }
    ],
    "steps": "1. Em taça de vinho com gelo, sirva o vermute tinto bem gelado.\n2. Esprema um gomo de limão siciliano e deixe no copo.\n3. Complete com água com gás e sirva na hora.",
    "description": "Leve, herbal e borbulhante: a essência do aperitivo italiano no fim da tarde.",
    "story": "Precursor simples dos spritzes do norte da Itália, nascido quando viajantes diluíam vinhos fortificados com água gaseificada.",
    "glass": "Taça de vinho",
    "technique": "Montado no copo (build)",
    "garnish": "Casca de limão siciliano",
    "shaken": false,
    "tags": ["Clássico", "Amargo", "Com soda / Tônica", "Vermute & Aperitivos"]
  },
  {
    "name": "Salty Gin Fizz",
    "category": "Cítricos",
    "ingredients": [
      { "n": "Gin", "q": "50 ml (London Dry)" },
      { "n": "Limão", "q": "25 ml (Taiti)" },
      { "n": "Sal", "q": "1 pitada" },
      { "n": "Água com gás", "q": "110 ml" },
      { "n": "Gelo", "q": "cubos" }
    ],
    "steps": "1. Passe limão em metade da borda do copo alto e encoste no sal (opcional), depois encha de gelo.\n2. Adicione gin, suco de limão taiti e uma pitada mínima de sal para realçar o cítrico.\n3. Complete com água com gás e mexa de leve.",
    "description": "Seco, mineral e zero açúcar: inspirado no Ranch Water texano com alma de gin.",
    "story": "O toque de sal reduz qualquer aspereza do limão e amplia os aromas botânicos do zimbro sem adicionar uma gota de xarope.",
    "glass": "Copo alto",
    "technique": "Montado no copo (build)",
    "garnish": "Fatia de limão e borda salgada",
    "shaken": false,
    "tags": ["Cítrico / Ácido", "Refrescante", "Com soda / Tônica", "Gin"]
  },
  {
    "name": "Caipirinha de Limão Siciliano",
    "category": "Brasileiríssimos",
    "ingredients": [
      { "n": "Cachaça", "q": "55 ml (Ouro)" },
      { "n": "Limão", "q": "1 unid (Siciliano)" },
      { "n": "Açúcar", "q": "2 colheres de chá" },
      { "n": "Gelo", "q": "cubos" }
    ],
    "steps": "1. Corte o limão siciliano em gomos retirando a parte branca central e macere suavemente com o açúcar.\n2. Adicione cachaça ouro e bastante gelo.\n3. Mexa bem ou dê um golpe rápido na coqueteleira para emulsionar os óleos da casca.",
    "description": "Perfume cítrico mais floral com a maciez amadeirada da cachaça ouro.",
    "story": "Releitura sofisticada dos bares de São Paulo que valoriza o óleo essencial aromático do limão siciliano sobre a madeira da cachaça.",
    "glass": "Copo baixo",
    "technique": "Macerado (muddle)",
    "garnish": "Fatia fina de limão siciliano",
    "shaken": false,
    "tags": ["Brasileiro", "Cítrico / Ácido", "Cachaça"]
  },
  {
    "name": "Caipirinha de Maçã Verde",
    "category": "Brasileiríssimos",
    "ingredients": [
      { "n": "Cachaça", "q": "50 ml (Prata)" },
      { "n": "Limão", "q": "0.5 unid (Taiti)" },
      { "n": "Xarope de maçã verde", "q": "25 ml" },
      { "n": "Açúcar", "q": "1 colher de chá" },
      { "n": "Gelo", "q": "cubos" }
    ],
    "steps": "1. Macere os pedaços de limão taiti com o açúcar e o xarope de maçã verde no copo.\n2. Encha de gelo e despeje a cachaça prata.\n3. Misture vigorosamente de baixo para cima.",
    "description": "Cor esmeralda vibrante com acidez crocante de maçã verde e frescor brasileiro.",
    "story": "Sucesso imediato em bares modernos ao unir a base popular da caipirinha com a nota ácida e frutada da maçã verde.",
    "glass": "Copo baixo",
    "technique": "Macerado (muddle)",
    "garnish": "Casca verde de limão",
    "shaken": false,
    "tags": ["Brasileiro", "Frutado", "Cítrico / Ácido", "Cachaça"]
  },
  {
    "name": "Caipirinha Carioca de Gengibre",
    "category": "Brasileiríssimos",
    "ingredients": [
      { "n": "Cachaça", "q": "50 ml (Ouro)" },
      { "n": "Limão", "q": "1 unid (Taiti)" },
      { "n": "Gengibre", "q": "3 fatias finas" },
      { "n": "Açúcar", "q": "2 colheres de chá" },
      { "n": "Gelo", "q": "cubos" }
    ],
    "steps": "1. Macere o gengibre fresco primeiro com o açúcar no fundo do copo ou coqueteleira.\n2. Acrescente os gomos de limão e pressione de leve.\n3. Adicione cachaça ouro, gelo e misture ou agite rapidamente.",
    "description": "Cachaça envelhecida com ardência aromática de gengibre fresco e limão taiti.",
    "story": "Inspirada nos quiosques da Zona Sul do Rio, onde o gengibre dá um choque térmico delicioso ao calor da praia.",
    "glass": "Copo baixo",
    "technique": "Macerado (muddle)",
    "garnish": "Lâmina de gengibre e limão",
    "shaken": false,
    "tags": ["Brasileiro", "Picante / Gengibre", "Cítrico / Ácido", "Cachaça"]
  },
  {
    "name": "Caipiroska de Maracujá",
    "category": "Brasileiríssimos",
    "ingredients": [
      { "n": "Vodka", "q": "55 ml" },
      { "n": "Maracujá", "q": "1 fruta" },
      { "n": "Açúcar", "q": "2 colheres de chá" },
      { "n": "Gelo", "q": "cubos" }
    ],
    "steps": "1. Coloque a polpa fresca de maracujá e o açúcar na coqueteleira e macere de leve.\n2. Adicione vodka e gelo e bata rápido por 8 segundos.\n3. Sirva com tudo no copo baixo.",
    "description": "Azedinha, cremosa e intensa: polpa fresca de maracujá com vodka bem gelada.",
    "story": "Presença obrigatória nos cardápios brasileiros de verão, celebrando o perfume ácido e as sementes crocantes do maracujá.",
    "glass": "Copo baixo",
    "technique": "Shaker",
    "garnish": "Meia casca ou sementes de maracujá",
    "shaken": true,
    "tags": ["Brasileiro", "Tropical", "Frutado", "Vodka"]
  },
  {
    "name": "Caipiroska de Morango",
    "category": "Brasileiríssimos",
    "ingredients": [
      { "n": "Vodka", "q": "55 ml" },
      { "n": "Morango", "q": "5 unid" },
      { "n": "Açúcar", "q": "2 colheres de chá" },
      { "n": "Limão", "q": "10 ml (Taiti)" },
      { "n": "Gelo", "q": "cubos" }
    ],
    "steps": "1. Macere os morangos limpos com o açúcar e um toque de limão no copo ou shaker.\n2. Complete com gelo e vodka e agite ou mexa bem.\n3. Sirva decorado com morango na borda.",
    "description": "Rubi, suculenta e popular: morango fresco macerado com vodka e toque cítrico.",
    "story": "Clássico absoluto das festas brasileiras desde os anos 1990; o fio de limão evita que fique enjoativa.",
    "glass": "Copo baixo",
    "technique": "Macerado (muddle)",
    "garnish": "Morango fatiado na borda",
    "shaken": false,
    "tags": ["Brasileiro", "Frutado", "Doce", "Vodka"]
  },
  {
    "name": "Caipiroska de Abacaxi com Hortelã",
    "category": "Brasileiríssimos",
    "ingredients": [
      { "n": "Vodka", "q": "55 ml" },
      { "n": "Abacaxi", "q": "3 pedaços" },
      { "n": "Hortelã", "q": "6 folhas" },
      { "n": "Açúcar", "q": "2 colheres de chá" },
      { "n": "Gelo", "q": "cubos" }
    ],
    "steps": "1. Macere os cubos de abacaxi com o açúcar e dê uma leve batida nas folhas de hortelã.\n2. Junte vodka e gelo e agite rápido ou mexa vigorosamente.\n3. Sirva em copo baixo com um ramo fresco de hortelã.",
    "description": "Dupla tropical imbatível: abacaxi doce macerado e frescor verde de hortelã.",
    "story": "Combinação querida dos bares praianos do Nordeste e do litoral paulista pela leveza e aroma herbal.",
    "glass": "Copo baixo",
    "technique": "Macerado (muddle)",
    "garnish": "Ramo de hortelã",
    "shaken": false,
    "tags": ["Brasileiro", "Tropical", "Herbal / Hortelã", "Vodka"]
  },
  {
    "name": "Caipiríssima de Morango",
    "category": "Brasileiríssimos",
    "ingredients": [
      { "n": "Rum", "q": "55 ml (Carta Branca)" },
      { "n": "Morango", "q": "4 unid" },
      { "n": "Limão", "q": "15 ml (Taiti)" },
      { "n": "Açúcar", "q": "2 colheres de chá" },
      { "n": "Gelo", "q": "cubos" }
    ],
    "steps": "1. Macere os morangos com o açúcar e o suco de limão no copo baixo.\n2. Adicione bastante gelo e o rum branco.\n3. Mexa bem até gelar e ficar homogêneo.",
    "description": "Versão caribenha da caipirinha de morango com notas leves de cana do rum branco.",
    "story": "Traz a doçura sutil da cana destilada em coluna para casar naturalmente com morangos frescos e limão.",
    "glass": "Copo baixo",
    "technique": "Macerado (muddle)",
    "garnish": "Morango aberto e rodela de limão",
    "shaken": false,
    "tags": ["Brasileiro", "Frutado", "Doce", "Rum"]
  },
  {
    "name": "Cachaça Mule",
    "category": "Brasileiríssimos",
    "ingredients": [
      { "n": "Cachaça", "q": "50 ml (Prata)" },
      { "n": "Limão", "q": "20 ml (Taiti)" },
      { "n": "Xarope de gengibre", "q": "25 ml" },
      { "n": "Água com gás", "q": "80 ml" },
      { "n": "Hortelã", "q": "6 folhas" },
      { "n": "Gelo", "q": "cubos" }
    ],
    "steps": "1. Bata cachaça prata, limão taiti e xarope de gengibre com gelo.\n2. Coe sobre gelo novo em caneca ou copo alto.\n3. Complete com água com gás e finalize com ramo de hortelã batido.",
    "description": "O Moscow Mule repensado com alma brasileira: cachaça fresca, limão e gengibre picante.",
    "story": "Criado na onda da nova coquetelaria nacional, onde a personalidade vegetal da cachaça prata substitui com vantagem a vodka neutra.",
    "glass": "Caneca ou copo alto",
    "technique": "Shaker + build",
    "garnish": "Ramo de hortelã e rodela de limão",
    "shaken": true,
    "tags": ["Brasileiro", "Picante / Gengibre", "Com soda / Tônica", "Cachaça"]
  },
  {
    "name": "Guaraná Mule",
    "category": "Brasileiríssimos",
    "ingredients": [
      { "n": "Vodka", "q": "50 ml" },
      { "n": "Limão", "q": "15 ml (Taiti)" },
      { "n": "Gengibre", "q": "3 fatias" },
      { "n": "Guaraná", "q": "100 ml" },
      { "n": "Hortelã", "q": "5 folhas" },
      { "n": "Gelo", "q": "cubos" }
    ],
    "steps": "1. Macere o gengibre fresco com o suco de limão no fundo da coqueteleira.\n2. Junte a vodka e gelo, bata firme e coe em copo com gelo.\n3. Complete com guaraná gelado e decore com hortelã.",
    "description": "Versão verde-amarela divertida do Mule usando guaraná gaseificado e gengibre fresco.",
    "story": "Nascido nas mesas de festa brasileiras quando o guaraná gelado assumiu o papel dos refrigerantes importados de gengibre.",
    "glass": "Copo alto",
    "technique": "Shaker + build",
    "garnish": "Hortelã e limão",
    "shaken": true,
    "tags": ["Brasileiro", "Picante / Gengibre", "Com soda / Tônica", "Vodka"]
  },
  {
    "name": "Cachaça & Tônica",
    "category": "Brasileiríssimos",
    "ingredients": [
      { "n": "Cachaça", "q": "50 ml (Prata)" },
      { "n": "Água tônica", "q": "120 ml" },
      { "n": "Limão", "q": "15 ml (Taiti)" },
      { "n": "Hortelã", "q": "5 folhas" },
      { "n": "Gelo", "q": "cubos" }
    ],
    "steps": "1. Encha uma taça balão ou copo alto com gelo grande.\n2. Adicione a cachaça prata e o suco de limão fresco.\n3. Complete com tônica bem gelada e finalize com hortelã aromática.",
    "description": "Leve como um Gin Tônica, com o perfume fresco da cana-de-açúcar e amargor limpo de quinino.",
    "story": "Conhecida em Minas e São Paulo como a resposta nacional ao Gin & Tonic, revelando toda a elegância herbal da cachaça branca.",
    "glass": "Taça balão",
    "technique": "Montado no copo (build)",
    "garnish": "Folhas de hortelã e rodela de limão",
    "shaken": false,
    "tags": ["Brasileiro", "Refrescante", "Com soda / Tônica", "Cachaça"]
  },
  {
    "name": "Chilcano de Cachaça",
    "category": "Refrescantes",
    "ingredients": [
      { "n": "Cachaça", "q": "50 ml (Prata)" },
      { "n": "Limão", "q": "20 ml (Taiti)" },
      { "n": "Gengibre", "q": "2 fatias" },
      { "n": "Refrigerante de limão", "q": "110 ml" },
      { "n": "Gelo", "q": "cubos" }
    ],
    "steps": "1. Macere levemente as fatias de gengibre com o limão no copo alto.\n2. Adicione gelo e a cachaça prata.\n3. Complete com refrigerante de limão bem gelado e misture de leve.",
    "description": "Inspirado no clássico Chilcano peruano, adaptado com cachaça prata, gengibre e gás cítrico.",
    "story": "Une a tradição sul-americana do Chilcano de Lima à versatilidade aromática do destilado brasileiro.",
    "glass": "Copo alto",
    "technique": "Montado no copo (build)",
    "garnish": "Fatia de gengibre e limão",
    "shaken": false,
    "tags": ["Brasileiro", "Refrescante", "Picante / Gengibre", "Com soda / Tônica", "Cachaça"]
  },
  {
    "name": "Veludo Vermelho",
    "category": "Fortes",
    "ingredients": [
      { "n": "Vodka", "q": "40 ml" },
      { "n": "Vermute", "q": "25 ml (Tinto)" },
      { "n": "Morango", "q": "3 unid" },
      { "n": "Limão", "q": "15 ml (Siciliano)" },
      { "n": "Gelo", "q": "cubos" }
    ],
    "steps": "1. Macere os morangos na coqueteleira com o limão siciliano.\n2. Adicione a vodka, o vermute tinto e gelo e bata forte por 10 segundos.\n3. Faça dupla coagem para taça coupe gelada.",
    "description": "Rubi profundo e aveludado: notas especiadas do vermute tinto abraçadas por morango fresco.",
    "story": "Homenagem aos drinks noturnos de speakeasy onde frutas vermelhas suavizam a profundidade herbácea dos aperitivos tintos.",
    "glass": "Taça coupe",
    "technique": "Shaker + double strain",
    "garnish": "Morango inteiro na borda",
    "shaken": true,
    "tags": ["Autoral", "Forte", "Frutado", "Curto", "Vodka", "Vermute & Aperitivos"]
  },
  {
    "name": "Bramble de Morango",
    "category": "Doces & Frutados",
    "ingredients": [
      { "n": "Gin", "q": "50 ml (London Dry)" },
      { "n": "Limão", "q": "25 ml (Siciliano)" },
      { "n": "Xarope de açúcar", "q": "15 ml" },
      { "n": "Morango", "q": "3 unid" },
      { "n": "Xarope de morango", "q": "15 ml" },
      { "n": "Gelo", "q": "triturado ou cubos" }
    ],
    "steps": "1. Bata gin, limão siciliano e xarope de açúcar com gelo.\n2. Coe em copo baixo cheio de gelo picado e morangos fatiados.\n3. Regue o xarope de morango por cima para criar o efeito cascata.",
    "description": "Adaptação vibrante do Bramble londrino trocando amora por morangos frescos e calda rubi.",
    "story": "Inspirado na criação de Dick Bradsell nos anos 1980 em Londres, mantendo o belo contraste visual entre a base cítrica clara e o fio vermelho.",
    "glass": "Copo baixo",
    "technique": "Shaker + float",
    "garnish": "Morango e meia rodela de limão",
    "shaken": true,
    "tags": ["Clássico", "Frutado", "Cítrico / Ácido", "Gin"]
  },
  {
    "name": "Gin Tônica de Maracujá",
    "category": "Refrescantes",
    "ingredients": [
      { "n": "Gin", "q": "50 ml (London Dry)" },
      { "n": "Maracujá", "q": "0.5 fruta" },
      { "n": "Hortelã", "q": "5 folhas" },
      { "n": "Água tônica", "q": "120 ml" },
      { "n": "Gelo", "q": "cubos" }
    ],
    "steps": "1. Encha uma taça balão com gelo e coloque a polpa de meio maracujá fresco.\n2. Despeje o gin e complete com tônica gelada.\n3. Mexa uma vez suavemente e decore com hortelã.",
    "description": "Azedinho tropical vibrante que transforma o Gin Tônica em drink de pôr do sol.",
    "story": "Um dos Gin Tônicas mais pedidos nos rooftops brasileiros pela combinação entre o aroma seco do zimbro e o frescor do maracujá.",
    "glass": "Taça balão",
    "technique": "Montado no copo (build)",
    "garnish": "Ramo de hortelã e sementes de maracujá",
    "shaken": false,
    "tags": ["Refrescante", "Tropical", "Com soda / Tônica", "Gin"]
  },
  {
    "name": "Gin Tônica de Maçã Verde e Hortelã",
    "category": "Refrescantes",
    "ingredients": [
      { "n": "Gin", "q": "50 ml (London Dry)" },
      { "n": "Xarope de maçã verde", "q": "15 ml" },
      { "n": "Limão", "q": "10 ml (Siciliano)" },
      { "n": "Hortelã", "q": "6 folhas" },
      { "n": "Água tônica", "q": "120 ml" },
      { "n": "Gelo", "q": "cubos" }
    ],
    "steps": "1. Adicione gin, xarope de maçã verde e limão siciliano na taça com gelo.\n2. Complete com água tônica bem gelada.\n3. Desperte a hortelã batendo nas mãos e finalize por cima.",
    "description": "Verdejante, crocante e refrescante: maçã verde com botânicos do gin e hortelã.",
    "story": "Combinação pensada para paladares que preferem notas frutadas mais frescas e menos doces no Gin Tônica.",
    "glass": "Taça balão",
    "technique": "Montado no copo (build)",
    "garnish": "Ramo de hortelã e casca de limão",
    "shaken": false,
    "tags": ["Refrescante", "Herbal / Hortelã", "Com soda / Tônica", "Gin"]
  },
  {
    "name": "Gin Tônica de Abacaxi e Gengibre",
    "category": "Refrescantes",
    "ingredients": [
      { "n": "Gin", "q": "50 ml (London Dry)" },
      { "n": "Abacaxi", "q": "2 pedaços" },
      { "n": "Gengibre", "q": "2 fatias" },
      { "n": "Água tônica", "q": "120 ml" },
      { "n": "Gelo", "q": "cubos" }
    ],
    "steps": "1. Macere suavemente o abacaxi e o gengibre no fundo da taça ou coqueteleira.\n2. Acrescente bastante gelo e o gin.\n3. Complete com tônica e mexa de leve.",
    "description": "Abacaxi doce equilibrado pelo calor aromático do gengibre fresco e tônica gelada.",
    "story": "Perfeito para dias quentes: a picância natural do gengibre prolonga o frescor do abacaxi a cada gole.",
    "glass": "Taça balão",
    "technique": "Montado no copo (build)",
    "garnish": "Triângulo de abacaxi e fatia de gengibre",
    "shaken": false,
    "tags": ["Refrescante", "Tropical", "Picante / Gengibre", "Com soda / Tônica", "Gin"]
  },
  {
    "name": "Moscow Mule de Morango",
    "category": "Autorais",
    "ingredients": [
      { "n": "Vodka", "q": "50 ml" },
      { "n": "Morango", "q": "3 unid" },
      { "n": "Limão", "q": "15 ml (Taiti)" },
      { "n": "Xarope de gengibre", "q": "25 ml" },
      { "n": "Água com gás", "q": "80 ml" },
      { "n": "Hortelã", "q": "5 folhas" },
      { "n": "Gelo", "q": "cubos" }
    ],
    "steps": "1. Macere os morangos com o limão no fundo da coqueteleira.\n2. Adicione vodka, xarope de gengibre e gelo e agite firme.\n3. Coe para o copo com gelo, complete com água com gás e decore com hortelã.",
    "description": "O Mule mais fotogênico da casa: doçura rubi de morango com choque de gengibre.",
    "story": "Variação autoral muito pedida por quem ama a picância do Moscow Mule mas busca um toque frutado marcante.",
    "glass": "Caneca ou copo alto",
    "technique": "Shaker + build",
    "garnish": "Morango e ramo de hortelã",
    "shaken": true,
    "tags": ["Autoral", "Frutado", "Picante / Gengibre", "Vodka"]
  },
  {
    "name": "Moscow Mule de Maracujá",
    "category": "Autorais",
    "ingredients": [
      { "n": "Vodka", "q": "50 ml" },
      { "n": "Maracujá", "q": "1 fruta" },
      { "n": "Limão", "q": "15 ml (Taiti)" },
      { "n": "Xarope de gengibre", "q": "25 ml" },
      { "n": "Água com gás", "q": "80 ml" },
      { "n": "Gelo", "q": "cubos" }
    ],
    "steps": "1. Bata polpa de maracujá, vodka, limão e xarope de gengibre com gelo.\n2. Coe sobre gelo novo (ou sirva rústico com algumas sementes) em copo alto.\n3. Complete com água com gás e decore com limão.",
    "description": "Explosão cítrica e picante: acidez intensa de maracujá encontra o calor do gengibre.",
    "story": "Reinterpretação tropical criada para transformar o clássico Mule de bar em um bestseller de verão.",
    "glass": "Caneca ou copo alto",
    "technique": "Shaker + build",
    "garnish": "Rodela de limão e maracujá",
    "shaken": true,
    "tags": ["Autoral", "Tropical", "Picante / Gengibre", "Vodka"]
  },
  {
    "name": "Mojito de Maracujá",
    "category": "Tiki & Tropicais",
    "ingredients": [
      { "n": "Rum", "q": "50 ml (Carta Branca)" },
      { "n": "Maracujá", "q": "1 fruta" },
      { "n": "Hortelã", "q": "8 folhas" },
      { "n": "Limão", "q": "15 ml (Taiti)" },
      { "n": "Xarope de açúcar", "q": "20 ml" },
      { "n": "Água com gás", "q": "80 ml" },
      { "n": "Gelo", "q": "cubos" }
    ],
    "steps": "1. No copo alto, macere suavemente hortelã com xarope de açúcar e limão.\n2. Acrescente a polpa de maracujá, o rum e bastante gelo.\n3. Complete com água com gás e misture de baixo para cima.",
    "description": "Refrescância cubana da hortelã turbinada pela acidez perfumada do maracujá.",
    "story": "Casamento tropical natural entre Havana e o Brasil, com aroma intenso desde o primeiro instante.",
    "glass": "Copo alto",
    "technique": "Macerado (muddle)",
    "garnish": "Ramo de hortelã e sementes de maracujá",
    "shaken": false,
    "tags": ["Tropical", "Herbal / Hortelã", "Refrescante", "Rum"]
  },
  {
    "name": "Mojito de Maçã Verde",
    "category": "Refrescantes",
    "ingredients": [
      { "n": "Rum", "q": "50 ml (Carta Branca)" },
      { "n": "Xarope de maçã verde", "q": "20 ml" },
      { "n": "Hortelã", "q": "8 folhas" },
      { "n": "Limão", "q": "20 ml (Taiti)" },
      { "n": "Água com gás", "q": "90 ml" },
      { "n": "Gelo", "q": "cubos" }
    ],
    "steps": "1. Pressione suavemente a hortelã com limão e xarope de maçã verde no copo alto.\n2. Encha de gelo e despeje o rum branco.\n3. Complete com água com gás e mexa delicadamente.",
    "description": "Mojito verde vibrante com acidez crocante de maçã e folhas frescas de hortelã.",
    "story": "Perfeito para quem procura um drink longo super refrescante com perfil moderno e cor luminosa.",
    "glass": "Copo alto",
    "technique": "Macerado (muddle)",
    "garnish": "Hortelã fresca e rodela de limão",
    "shaken": false,
    "tags": ["Refrescante", "Herbal / Hortelã", "Com soda / Tônica", "Rum"]
  },
  {
    "name": "Daiquiri de Abacaxi",
    "category": "Tiki & Tropicais",
    "ingredients": [
      { "n": "Rum", "q": "50 ml (Carta Branca)" },
      { "n": "Abacaxi", "q": "3 pedaços" },
      { "n": "Limão", "q": "20 ml (Taiti)" },
      { "n": "Xarope de açúcar", "q": "15 ml" },
      { "n": "Gelo", "q": "cubos" }
    ],
    "steps": "1. Macere bem o abacaxi na coqueteleira.\n2. Adicione rum branco, limão, xarope de açúcar e gelo e bata forte por 12 segundos.\n3. Coe duas vezes para taça coupe gelada.",
    "description": "Clássico cubano enriquecido com abacaxi fresco batido na coqueteleira.",
    "story": "Variação de ilha popularizada nos bares de Havana dos anos 1940 para ressaltar o lado frutado do rum carta branca.",
    "glass": "Taça coupe",
    "technique": "Shaker + double strain",
    "garnish": "Triângulo ou folha de abacaxi",
    "shaken": true,
    "tags": ["Tropical", "Cítrico / Ácido", "Curto", "Rum"]
  },
  {
    "name": "Daiquiri de Maracujá",
    "category": "Tiki & Tropicais",
    "ingredients": [
      { "n": "Rum", "q": "50 ml (Carta Branca)" },
      { "n": "Maracujá", "q": "1 fruta" },
      { "n": "Limão", "q": "15 ml (Taiti)" },
      { "n": "Xarope de açúcar", "q": "20 ml" },
      { "n": "Gelo", "q": "cubos" }
    ],
    "steps": "1. Bata polpa de maracujá, rum, limão e xarope de açúcar com bastante gelo.\n2. Faça dupla coagem para uma taça coupe previamente gelada.\n3. Finalize com algumas sementes por cima para aroma.",
    "description": "Azedinho sedoso de cor dourada: Daiquiri clássico com polpa de maracujá fresco.",
    "story": "Inspirado no estilo do Pornstar Martini e dos daiquiris tropicais de praia, com textura incrivelmente aerada.",
    "glass": "Taça coupe",
    "technique": "Shaker + double strain",
    "garnish": "Meia casca de maracujá ou twist de limão",
    "shaken": true,
    "tags": ["Tropical", "Cítrico / Ácido", "Curto", "Rum"]
  },
  {
    "name": "Tiki Tônica do Campos",
    "category": "Tiki & Tropicais",
    "ingredients": [
      { "n": "Rum", "q": "50 ml (Carta Branca)" },
      { "n": "Abacaxi", "q": "2 pedaços" },
      { "n": "Limão", "q": "15 ml (Taiti)" },
      { "n": "Xarope de açúcar", "q": "10 ml" },
      { "n": "Água tônica", "q": "110 ml" },
      { "n": "Gelo", "q": "cubos" }
    ],
    "steps": "1. Macere o abacaxi com limão e xarope na coqueteleira e bata rápido com o rum e gelo.\n2. Coe em taça ou copo alto com gelo novo.\n3. Complete com água tônica gelada.",
    "description": "Highball tropical leve: rum e abacaxi cortados pelo amargor limpo da tônica.",
    "story": "Mostra que o espírito Tiki pode ser leve e refrescante sem precisar de meia dúzia de licores.",
    "glass": "Taça balão",
    "technique": "Shaker + build",
    "garnish": "Fatia e folha de abacaxi",
    "shaken": true,
    "tags": ["Autoral", "Tropical", "Com soda / Tônica", "Rum"]
  },
  {
    "name": "Frozen de Morango com Hortelã",
    "category": "Frozen",
    "ingredients": [
      { "n": "Vodka", "q": "50 ml" },
      { "n": "Morango", "q": "5 unid" },
      { "n": "Limão", "q": "20 ml (Taiti)" },
      { "n": "Xarope de açúcar", "q": "20 ml" },
      { "n": "Hortelã", "q": "6 folhas" },
      { "n": "Gelo", "q": "150 g" }
    ],
    "steps": "1. Bata morangos, vodka, limão, xarope de açúcar, hortelã e gelo no liquidificador até ficar cremoso.\n2. Sirva em taça grande.\n3. Decore com morango fresco e raminho de hortelã.",
    "description": "Raspadinha alcoólica de morango vivo com toque verde refrescante de hortelã.",
    "story": "Pensado para tardes de sol ou piscina, entregando cremosidade sem nenhum laticínio.",
    "glass": "Taça hurricane",
    "technique": "Batido (blend)",
    "garnish": "Morango e hortelã",
    "shaken": false,
    "tags": ["Frozen", "Frutado", "Herbal / Hortelã", "Vodka"]
  },
  {
    "name": "Frozen de Maracujá com Gengibre",
    "category": "Frozen",
    "ingredients": [
      { "n": "Rum", "q": "50 ml (Carta Branca)" },
      { "n": "Maracujá", "q": "1 fruta" },
      { "n": "Limão", "q": "15 ml (Taiti)" },
      { "n": "Xarope de gengibre", "q": "15 ml" },
      { "n": "Xarope de açúcar", "q": "15 ml" },
      { "n": "Gelo", "q": "150 g" }
    ],
    "steps": "1. Coloque todos os ingredientes no liquidificador com gelo.\n2. Bata na potência máxima até formar creme uniforme e gelado.\n3. Sirva em taça grande decorada com maracujá.",
    "description": "Creme gelado tropical de maracujá com picância elegante de gengibre e rum branco.",
    "story": "Combinação autoral de contraste térmico: super gelado na textura e levemente picante no retrogosto.",
    "glass": "Taça hurricane",
    "technique": "Batido (blend)",
    "garnish": "Sementes de maracujá e limão",
    "shaken": false,
    "tags": ["Frozen", "Tropical", "Picante / Gengibre", "Rum"]
  },
  {
    "name": "Energy Tropical Gin",
    "category": "Energéticos",
    "ingredients": [
      { "n": "Gin", "q": "50 ml (London Dry)" },
      { "n": "Maracujá", "q": "0.5 fruta" },
      { "n": "Limão", "q": "10 ml (Taiti)" },
      { "n": "Energético", "q": "120 ml" },
      { "n": "Gelo", "q": "cubos" }
    ],
    "steps": "1. Coloque bastante gelo, a polpa de maracujá e o limão em um copo alto.\n2. Despeje o gin.\n3. Complete com energético bem gelado e misture devagar.",
    "description": "Gin aromático e maracujá fresco turbinados com energético gelado.",
    "story": "Queridinho das noites de festa para quem quer sair do combo tradicional de energético com vodka.",
    "glass": "Copo alto",
    "technique": "Montado no copo (build)",
    "garnish": "Rodela de limão",
    "shaken": false,
    "tags": ["Energético", "Tropical", "Longo", "Gin"]
  },
  {
    "name": "Green Apple Bomb",
    "category": "Energéticos",
    "ingredients": [
      { "n": "Vodka", "q": "50 ml" },
      { "n": "Xarope de maçã verde", "q": "20 ml" },
      { "n": "Limão", "q": "15 ml (Taiti)" },
      { "n": "Energético", "q": "110 ml" },
      { "n": "Gelo", "q": "cubos" }
    ],
    "steps": "1. Encha um copo alto com gelo.\n2. Adicione vodka, xarope de maçã verde e limão.\n3. Complete com energético gelado e mexa uma vez.",
    "description": "Verde elétrico, ácido e vibrante: maçã verde cítrica com energia na medida.",
    "story": "Inspirado nos highballs neon de pista de dança, equilibrado pelo suco de limão fresco.",
    "glass": "Copo alto",
    "technique": "Montado no copo (build)",
    "garnish": "Fatia fina de limão",
    "shaken": false,
    "tags": ["Energético", "Cítrico / Ácido", "Longo", "Vodka"]
  },
  {
    "name": "Groselha Spritz Zero",
    "category": "Sem álcool",
    "ingredients": [
      { "n": "Xarope de groselha", "q": "25 ml" },
      { "n": "Limão", "q": "20 ml (Taiti)" },
      { "n": "Hortelã", "q": "6 folhas" },
      { "n": "Água com gás", "q": "130 ml" },
      { "n": "Gelo", "q": "cubos" }
    ],
    "steps": "1. Encha uma taça balão com gelo e dê uma leve maceração nas folhas de hortelã com o limão.\n2. Adicione o xarope de groselha.\n3. Complete com água com gás e mexa suavemente.",
    "description": "Soda artesanal vermelha de groselha cortada por limão taiti e hortelã fresca.",
    "story": "Resgata a nostalgia da groselha de infância em uma versão adulta, seca no ponto e super aromática.",
    "glass": "Taça balão",
    "technique": "Montado no copo (build)",
    "garnish": "Ramo de hortelã e rodela de limão",
    "shaken": false,
    "tags": ["Sem álcool", "Frutado", "Refrescante", "Com soda / Tônica"]
  },
  {
    "name": "Maracujá Fizz Zero",
    "category": "Sem álcool",
    "ingredients": [
      { "n": "Maracujá", "q": "1 fruta" },
      { "n": "Limão", "q": "15 ml (Taiti)" },
      { "n": "Xarope de gengibre", "q": "20 ml" },
      { "n": "Água com gás", "q": "120 ml" },
      { "n": "Hortelã", "q": "5 folhas" },
      { "n": "Gelo", "q": "cubos" }
    ],
    "steps": "1. Bata a polpa de maracujá, o limão e o xarope de gengibre com gelo.\n2. Coe em copo alto com gelo novo.\n3. Complete com água com gás e finalize com hortelã.",
    "description": "Mocktail sofisticado com acidez de maracujá, picância de gengibre e final borbulhante.",
    "story": "Criado para oferecer experiência de coquetelaria completa a quem não está bebendo álcool.",
    "glass": "Copo alto",
    "technique": "Shaker + build",
    "garnish": "Hortelã e sementes de maracujá",
    "shaken": true,
    "tags": ["Sem álcool", "Tropical", "Picante / Gengibre", "Com soda / Tônica"]
  },
  {
    "name": "Abacaxi Cooler Zero",
    "category": "Sem álcool",
    "ingredients": [
      { "n": "Abacaxi", "q": "3 pedaços" },
      { "n": "Hortelã", "q": "7 folhas" },
      { "n": "Limão", "q": "15 ml (Taiti)" },
      { "n": "Refrigerante de limão", "q": "120 ml" },
      { "n": "Gelo", "q": "cubos" }
    ],
    "steps": "1. Macere o abacaxi com a hortelã e o limão no fundo do copo alto.\n2. Complete com bastante gelo.\n3. Finalize com refrigerante de limão gelado e mexa devagar.",
    "description": "Cooler natural gelado de abacaxi macerado com hortelã e gás cítrico.",
    "story": "Opção leve para qualquer idade, trazendo frescor imediato com ingredientes naturais da casa.",
    "glass": "Copo alto",
    "technique": "Macerado (muddle)",
    "garnish": "Fatia de abacaxi e hortelã",
    "shaken": false,
    "tags": ["Sem álcool", "Tropical", "Herbal / Hortelã", "Refrescante"]
  },
  {
    "name": "Jarra de Gin Tônica Tropical",
    "category": "Jarras",
    "ingredients": [
      { "n": "Gin", "q": "200 ml (London Dry)" },
      { "n": "Abacaxi", "q": "6 pedaços" },
      { "n": "Morango", "q": "6 unid" },
      { "n": "Limão", "q": "1 unid (Siciliano)" },
      { "n": "Hortelã", "q": "12 folhas" },
      { "n": "Água tônica", "q": "500 ml" },
      { "n": "Gelo", "q": "bastante gelo" }
    ],
    "steps": "1. Encha uma jarra de 1 litro até a metade com cubos de gelo.\n2. Distribua abacaxi em cubos, morangos fatiados, rodelas de limão siciliano e hortelã.\n3. Adicione o gin, complete com água tônica gelada e mexa com colher bailarina.",
    "description": "Jarra compartilhável de 1 L: Gin Tônica frutado com abacaxi, morango, limão e hortelã.",
    "story": "Ideal para reunir a mesa inteira em celebrações: colorida, leve e com ótimo rendimento por dose.",
    "glass": "Jarra 1 L",
    "technique": "Montado na jarra",
    "garnish": "Ramos de hortelã e frutas frescas",
    "shaken": false,
    "tags": ["Para dividir (Jarra)", "Refrescante", "Com soda / Tônica", "Gin"]
  },
  {
    "name": "Conhaque Sour do Engenho",
    "category": "Autorais",
    "ingredients": [
      { "n": "Conhaque", "q": "40 ml" },
      { "n": "Cachaça", "q": "20 ml (Ouro)" },
      { "n": "Limão", "q": "25 ml (Siciliano)" },
      { "n": "Xarope de açúcar", "q": "20 ml" },
      { "n": "Gelo", "q": "cubos" }
    ],
    "steps": "1. Misture conhaque, cachaça ouro, limão siciliano e xarope de açúcar na coqueteleira.\n2. Bata forte com gelo por 12 segundos.\n3. Coe duas vezes sobre uma pedra grande de gelo.",
    "description": "Fusão autoral franco-brasileira: madeira nobre do conhaque com cachaça ouro e siciliano.",
    "story": "Criado para unir duas culturas de destilados envelhecidos em um sour sedoso e perfumado.",
    "glass": "Old fashioned",
    "technique": "Shaker + double strain",
    "garnish": "Casca de limão siciliano",
    "shaken": true,
    "tags": ["Autoral", "Brasileiro", "Cítrico / Ácido", "Conhaque", "Cachaça"]
  },
  {
    "name": "Caipirinha Rubi de Groselha",
    "category": "Brasileiríssimos",
    "ingredients": [
      { "n": "Cachaça", "q": "50 ml (Prata)" },
      { "n": "Limão", "q": "1 unid (Taiti)" },
      { "n": "Xarope de groselha", "q": "20 ml" },
      { "n": "Gelo", "q": "cubos" }
    ],
    "steps": "1. Macere levemente os gomos de limão taiti no copo baixo.\n2. Adicione o xarope de groselha (no lugar do açúcar), cachaça prata e bastante gelo.\n3. Mexa bem ou bata rápido na coqueteleira.",
    "description": "Caipirinha cor de rubi onde o xarope de groselha substitui o açúcar com doçura frutada.",
    "story": "Truque clássico de botecos criativos do interior que dá cor vibrante e sabor nostálgico ao coquetel nacional.",
    "glass": "Copo baixo",
    "technique": "Macerado (muddle)",
    "garnish": "Rodela de limão taiti",
    "shaken": false,
    "tags": ["Brasileiro", "Doce", "Frutado", "Cachaça"]
  },
  {
    "name": "Rabo de Galo com Limão",
    "category": "Brasileiríssimos",
    "ingredients": [
      { "n": "Cachaça", "q": "50 ml (Ouro)" },
      { "n": "Vermute", "q": "25 ml (Tinto)" },
      { "n": "Limão", "q": "10 ml (Taiti)" },
      { "n": "Gelo", "q": "1 cubo grande" }
    ],
    "steps": "1. Coloque cachaça ouro, vermute tinto e um fio de suco de limão sobre gelo no copo baixo.\n2. Mexa por 15 segundos para integrar e gelar.\n3. Perfume com a casca do limão.",
    "description": "Rabo de Galo mais fresco e equilibrado com toque cítrico vivo cortando a doçura do vermute.",
    "story": "Interpretação contemporânea do ícone paulistano dos balcões dos anos 1950, mantendo a alma firme da cachaça.",
    "glass": "Old fashioned",
    "technique": "Mexido",
    "garnish": "Casca de limão",
    "shaken": false,
    "tags": ["Brasileiro", "Forte", "Curto", "Cachaça", "Vermute & Aperitivos"]
  },
  {
    "name": "Ginger Spritz de Conhaque",
    "category": "Aperitivos",
    "ingredients": [
      { "n": "Conhaque", "q": "35 ml" },
      { "n": "Vermute", "q": "25 ml (Tinto)" },
      { "n": "Xarope de gengibre", "q": "15 ml" },
      { "n": "Água com gás", "q": "90 ml" },
      { "n": "Limão", "q": "10 ml (Siciliano)" },
      { "n": "Gelo", "q": "cubos" }
    ],
    "steps": "1. Em taça com gelo, misture conhaque, vermute tinto, xarope de gengibre e limão.\n2. Complete com água com gás bem gelada.\n3. Mexa uma vez suavemente.",
    "description": "Aperitivo especiado de conhaque e vermute tinto alongado com gengibre e gás.",
    "story": "Une a complexidade de um Metropolitan leve com a refrescância gaseificada de um spritz noturno.",
    "glass": "Taça de vinho",
    "technique": "Montado no copo (build)",
    "garnish": "Fatia fina de gengibre e limão",
    "shaken": false,
    "tags": ["Autoral", "Picante / Gengibre", "Com soda / Tônica", "Conhaque", "Vermute & Aperitivos"]
  },
  {
    "name": "Vodka Tônica de Morango e Hortelã",
    "category": "Refrescantes",
    "ingredients": [
      { "n": "Vodka", "q": "50 ml" },
      { "n": "Morango", "q": "3 unid" },
      { "n": "Hortelã", "q": "6 folhas" },
      { "n": "Limão", "q": "10 ml (Taiti)" },
      { "n": "Água tônica", "q": "120 ml" },
      { "n": "Gelo", "q": "cubos" }
    ],
    "steps": "1. Macere levemente 2 morangos com limão no copo alto.\n2. Adicione gelo, vodka e hortelã batida.\n3. Complete com água tônica e decore com o morango restante.",
    "description": "Alternativa leve ao Gin Tônica para quem prefere base neutra de vodka com frutas frescas.",
    "story": "Combina a pureza gelada da vodka com aroma campestre de morango e hortelã sobre quinino leve.",
    "glass": "Copo alto",
    "technique": "Montado no copo (build)",
    "garnish": "Morango e hortelã",
    "shaken": false,
    "tags": ["Refrescante", "Frutado", "Herbal / Hortelã", "Com soda / Tônica", "Vodka"]
  },
  {
    "name": "Abacaxi Smash de Rum",
    "category": "Tiki & Tropicais",
    "ingredients": [
      { "n": "Rum", "q": "50 ml (Carta Branca)" },
      { "n": "Abacaxi", "q": "3 pedaços" },
      { "n": "Hortelã", "q": "8 folhas" },
      { "n": "Limão", "q": "15 ml (Taiti)" },
      { "n": "Xarope de açúcar", "q": "15 ml" },
      { "n": "Gelo", "q": "cubos" }
    ],
    "steps": "1. Macere o abacaxi com a hortelã e o xarope na coqueteleira.\n2. Adicione rum e limão, bata com gelo por 10 segundos.\n3. Coe grosso em copo baixo com gelo novo.",
    "description": "Rum carta branca batido com pedaços de abacaxi fresco e bastante hortelã aromática.",
    "story": "Resgata a tradição dos Smashes clássicos americanos em roupagem caribenha de fruta fresca.",
    "glass": "Copo baixo",
    "technique": "Shaker",
    "garnish": "Ramo de hortelã e abacaxi",
    "shaken": true,
    "tags": ["Tropical", "Herbal / Hortelã", "Refrescante", "Rum"]
  },
  {
    "name": "Ginger Smash de Gin",
    "category": "Refrescantes",
    "ingredients": [
      { "n": "Gin", "q": "50 ml (London Dry)" },
      { "n": "Gengibre", "q": "3 fatias" },
      { "n": "Limão", "q": "20 ml (Siciliano)" },
      { "n": "Hortelã", "q": "6 folhas" },
      { "n": "Xarope de açúcar", "q": "15 ml" },
      { "n": "Gelo", "q": "cubos" }
    ],
    "steps": "1. Macere as fatias de gengibre com xarope de açúcar no fundo da coqueteleira.\n2. Junte gin, limão siciliano, hortelã e gelo e agite firme.\n3. Coe duas vezes sobre gelo novo em copo baixo.",
    "description": "Parente picante do Gin Basil Smash: gengibre fresco, hortelã, limão siciliano e gin.",
    "story": "Une o frescor herbáceo do Smash europeu com a energia vibrante do gengibre recém-macerado.",
    "glass": "Copo baixo",
    "technique": "Shaker + double strain",
    "garnish": "Lâmina de gengibre e hortelã",
    "shaken": true,
    "tags": ["Refrescante", "Picante / Gengibre", "Herbal / Hortelã", "Gin"]
  },
  {
    "name": "Guaraná Spritz da Casa",
    "category": "Autorais",
    "ingredients": [
      { "n": "Vermute", "q": "50 ml (Tinto)" },
      { "n": "Guaraná", "q": "100 ml" },
      { "n": "Limão", "q": "15 ml (Taiti)" },
      { "n": "Hortelã", "q": "5 folhas" },
      { "n": "Gelo", "q": "cubos" }
    ],
    "steps": "1. Encha uma taça de vinho com gelo.\n2. Despeje o vermute tinto e o suco de limão.\n3. Complete com guaraná gelado e finalize com hortelã.",
    "description": "Aperitivo brasileiro leve: ervas amargas do vermute tinto equilibradas com guaraná e limão.",
    "story": "Mostra como ingredientes cotidianos da geladeira brasileira criam um spritz de boteco cheio de personalidade.",
    "glass": "Taça de vinho",
    "technique": "Montado no copo (build)",
    "garnish": "Rodela de limão e hortelã",
    "shaken": false,
    "tags": ["Autoral", "Brasileiro", "Com soda / Tônica", "Vermute & Aperitivos"]
  },
  {
    "name": "Shot Fogo Verde",
    "category": "Shots",
    "ingredients": [
      { "n": "Vodka", "q": "30 ml" },
      { "n": "Xarope de maçã verde", "q": "15 ml" },
      { "n": "Limão", "q": "10 ml (Taiti)" },
      { "n": "Xarope de gengibre", "q": "5 ml" },
      { "n": "Gelo", "q": "para bater" }
    ],
    "steps": "1. Bata todos os ingredientes bem gelados na coqueteleira com gelo por 8 segundos.\n2. Coe direto para o copo de shot gelado.",
    "description": "Shot esmeralda ágil que começa ácido de maçã verde e termina com picância de gengibre.",
    "story": "Criado para animar brindes em grupo sem ser enjoativo — curto, gelado e marcante.",
    "glass": "Copo shot",
    "technique": "Shaker",
    "garnish": "Sem guarnição",
    "shaken": true,
    "tags": ["Shot", "Autoral", "Picante / Gengibre", "Vodka"]
  },
  {
    "name": "Jarra de Moscow Mule de Morango",
    "category": "Jarras",
    "ingredients": [
      { "n": "Vodka", "q": "200 ml" },
      { "n": "Morango", "q": "10 unid" },
      { "n": "Limão", "q": "60 ml (Taiti)" },
      { "n": "Xarope de gengibre", "q": "90 ml" },
      { "n": "Água com gás", "q": "350 ml" },
      { "n": "Hortelã", "q": "12 folhas" },
      { "n": "Gelo", "q": "bastante gelo" }
    ],
    "steps": "1. Macere os morangos fatiados com o xarope de gengibre e o suco de limão no fundo da jarra.\n2. Adicione gelo e vodka, mexendo bem.\n3. Complete com água com gás gelada e decore com bastante hortelã.",
    "description": "Jarra festiva de 1 L de Moscow Mule rosado com morango fresco, gengibre e hortelã.",
    "story": "Pensada para compartilhar em comemorações: mantém a refrescância do Mule sem precisar preparar copo por copo.",
    "glass": "Jarra 1 L",
    "technique": "Montado na jarra",
    "garnish": "Morangos, limão e hortelã",
    "shaken": false,
    "tags": ["Para dividir (Jarra)", "Frutado", "Picante / Gengibre", "Vodka"]
  }
];
