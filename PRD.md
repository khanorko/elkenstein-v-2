# 📄 PRD: ELKENSTEIN V2 - THE AWAKENING

## 1. Vision & Syfte
ELKENSTEIN V2 är en modern 3D-remake av den ursprungliga raycasting-klonen. Spelet är en politisk satir-shooter som sätter spelaren (Anders) i rollen som demokratins sista försvarare i ett dystopiskt Sverige 2026. Syftet är att kombinera klassiskt Doom-spelupplägg med dagsaktuell svensk satir genom en avancerad procedurell motor.

## 2. Tekniskt Ramverk
- **Motor:** Three.js (WebGL) för hårdvaruaccelererad 3D-rendering.
- **Arkitektur:** Modulär JavaScript (ES Modules).
- **Grafik:** Procedurellt genererade texturer och karikatyrer för att minimera laddningstider och möjliggöra oändlig variation.
- **Ljud:** Web Audio API för realtidssyntes (inget behov av externa ljudfiler).

## 3. Nuvarande Status
- Fullt fungerande 3D-miljö med kollisionshantering.
- Dynamiskt vapensystem med rekyl, bobbing och mynningsflammor.
- Fiende-AI som jagar spelaren och kan låsas in bakom interaktiva 3D-dörrar.
- Procedurell generering av 10+ olika SD-karikatyrer.
- Flytande 3D-slagord vid attacker.

## 4. Långtgående Planer (Roadmap)

### Fas 1: Core Polish (Nuvarande)
- [ ] **Ljudlandskap:** Implementera ett djupt, reaktivt ljudsystem som ändras beroende på rummets storlek och fiendetäthet.
- [ ] **Vapenarsenal:** Utöka till 3-4 vapen med unika animationer och ljudbilder (Pistol, Kulspruta, Hagelgevär, "Debatt-mikrofon").
- [ ] **Visuell rikedom:** Lägga till dynamiska skuggor, partikeleffekter för blod/skrot och fler procedurella väggdekorationer.

### Fas 2: Progression & Berättelse
- [ ] **Nivåsystem:** Skapa en serie banor som representerar olika delar av maktens korridorer (Riksdagen, Rosenbad, SVT-huset, Troll-fabriken).
- [ ] **Narrativa inslag:** Små text-sekvenser eller "radio-meddelanden" mellan banorna som driver storyn framåt.
- [ ] **Boss-mekanik:** Varje boss ska ha en unik svaghet kopplad till sin politiska personlighet (t.ex. "meningslös debatt" för Jimmie).

### Fas 3: Avancerade Funktioner & Distribution
- [ ] **Meta-statistik:** Ett system som loggar "antalet vunna debatter", "besegrade troll" och "sparad skattekrona".
- [ ] **Mobilanpassning:** Touch-kontroller för spel på språng.
- [ ] **Mod-stöd:** Göra det enkelt att lägga till nya politiker genom att bara redigera JSON-filer med färgvärden och citat.

## 5. Målgrupp & Estetik
- **Estetik:** "Hi-fi Retro" – kombinerar pixliga texturer med moderna effekter som bloom, dynamiskt ljus och mjuka animationer.
- **Ton:** Satirisk, fartfylld och utmanande.

---
*Detta dokument är ett levande dokument och ska uppdateras av Gemini och Claude allt eftersom projektet utvecklas.*
