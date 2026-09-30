/* The two research illustrations. Text comes from window.IL_TEXT so both languages share one drawing. */
(function () {
  function e(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
  function car(x, y, cls) {
    return '<g transform="translate(' + x + ' ' + y + ')"><path d="M0 14V8L6 3H22L28 8V14Z" class="car ' + cls + '"/><circle cx="6" cy="15" r="3" class="wheel"/><circle cx="22" cy="15" r="3" class="wheel"/></g>';
  }
  function energy(T) {
    var cars = '', pat = [['c', 'c', 'v', 'c'], ['v', '', 'c', 'v'], ['c', 'v', 'c', '']];
    for (var r = 0; r < 3; r++) for (var c = 0; c < 4; c++) cars += car(944 + c * 32, 340 + r * 30, pat[r][c]);
    return '<svg class="il" viewBox="0 0 1200 500" role="img" aria-label="' + e(T.aria_energy) + '">' +
      '<rect x="300" y="14" width="600" height="120" rx="12" class="agent"/>' +
      '<text x="324" y="48" class="t-h">' + e(T.agent) + '</text>' +
      '<text x="324" y="74" class="t-s t-ink">' + e(T.obs1) + '</text>' +
      '<text x="324" y="96" class="t-s t-ink">' + e(T.obs2) + '</text>' +
      '<text x="324" y="122" class="t-m">' + e(T.policy) + '</text>' +
      '<path d="M724 36V112H880" class="soft"/>' +
      '<polyline points="728,104 738,101 746,104 756,94 766,97 776,84 786,88 796,72 806,76 816,62 826,64 836,54 846,55 856,46 866,44 876,42" class="curve"/>' +
      '<text x="728" y="129" class="t-m t-xs">' + e(T.reward) + '</text>' +
      '<path d="M594 134V172" class="obs"/><path d="M606 134V172" class="ctl"/>' +
      '<text x="584" y="160" class="t-s" text-anchor="end">' + e(T.observe) + '</text>' +
      '<text x="616" y="160" class="t-s t-acc">' + e(T.act) + '</text>' +
      '<path d="M150 172H1050M150 172V200M450 172V200M750 172V200M1050 172V200" class="ctl"/>' +
      '<path d="M144 194L150 202L156 194M444 194L450 202L456 194M744 194L750 202L756 194M1044 194L1050 202L1056 194" class="ctl"/>' +
      '<path d="M40 440H1160" class="soft"/>' +
      '<circle cx="96" cy="296" r="18" class="sun"/>' +
      '<path d="M60 420L76 388H116L100 420ZM112 420L128 388H168L152 420Z" class="o"/>' +
      '<path d="M68 404H108M120 404H160M88 388L80 420M140 388L132 420" class="soft"/>' +
      '<path d="M80 420V440M132 420V440" class="ln"/>' +
      '<path d="M206 440L208 330H212L214 440Z" class="fill-ink"/>' +
      '<g class="blades"><path d="M210 330V282M210 330L251.6 354M210 330L168.4 354" class="ln w4"/></g>' +
      '<circle cx="210" cy="330" r="5" class="fill-ink"/>' +
      '<rect x="390" y="340" width="110" height="90" rx="4" class="o"/>' +
      '<rect x="400" y="350" width="18" height="70" class="cell"/><rect x="425" y="350" width="18" height="70" class="cell"/><rect x="450" y="350" width="18" height="70" class="cell"/><rect x="475" y="350" width="18" height="70" class="cell"/>' +
      '<rect x="400" y="372" width="18" height="48" class="soc"/><rect x="425" y="360" width="18" height="60" class="soc"/><rect x="450" y="384" width="18" height="36" class="soc"/><rect x="475" y="366" width="18" height="54" class="soc"/>' +
      '<rect x="516" y="368" width="30" height="62" rx="15" class="o"/><text x="531" y="404" class="t-m" text-anchor="middle">H₂</text>' +
      '<path d="M712 440L740 290L768 440M720 400H760M727 360H753M734 322H746M700 300H780M708 330H772" class="ln thin"/>' +
      '<rect x="800" y="392" width="36" height="48" rx="3" class="o"/>' +
      '<circle cx="818" cy="409" r="8" class="ln thin"/><circle cx="818" cy="423" r="8" class="ln thin"/><path d="M762 410H800" class="ln"/>' +
      '<path d="M932 330H1080" class="ln w2"/><path d="M940 330V440M1072 330V440" class="soft"/>' + cars +
      '<rect x="1098" y="282" width="52" height="158" class="o"/>' +
      '<path d="M1106 302H1142M1106 324H1142M1106 346H1142M1106 368H1142M1106 390H1142M1106 412H1142" class="windows"/>' +
      '<path d="M110 300C260 222 560 222 700 300" class="flow"/><path d="M232 400C300 400 330 380 388 380" class="flow"/>' +
      '<path d="M552 400C620 400 660 370 722 370" class="flow"/><path d="M780 300C850 300 880 330 932 330" class="flow"/>' +
      '<path d="M780 300C880 268 1000 262 1098 290" class="flow"/><path d="M944 424C900 424 870 424 836 424" class="flow v2g"/>' +
      '<text x="150" y="470" class="t-h" text-anchor="middle">' + e(T.gen) + '</text><text x="150" y="492" class="t-s" text-anchor="middle">' + e(T.gen_s) + '</text>' +
      '<text x="468" y="470" class="t-h" text-anchor="middle">' + e(T.sto) + '</text><text x="468" y="492" class="t-s" text-anchor="middle">' + e(T.sto_s) + '</text>' +
      '<text x="768" y="470" class="t-h" text-anchor="middle">' + e(T.dis) + '</text><text x="768" y="492" class="t-s" text-anchor="middle">' + e(T.dis_s) + '</text>' +
      '<text x="1046" y="470" class="t-h" text-anchor="middle">' + e(T.con) + '</text><text x="1046" y="492" class="t-s" text-anchor="middle">' + e(T.con_s) + '</text>' +
      '</svg>';
  }
  function energyLegend(T) {
    return '<div class="legend"><span><i class="k-flow"></i>' + e(T.l_flow) + '</span><span><i class="k-v2g"></i>' + e(T.l_v2g) + '</span><span><i class="k-act"></i>' + e(T.l_act) + '</span>' +
      '<span><i class="box k-charge"></i>' + e(T.l_charge) + '</span><span><i class="box k-discharge"></i>' + e(T.l_discharge) + '</span></div>';
  }
  function industrial(T) {
    var rollers = '';
    for (var x = 60; x <= 384; x += 36) rollers += '<circle cx="' + x + '" cy="340" r="4" class="dot"/>';
    return '<svg class="il" viewBox="0 0 1200 460" role="img" aria-label="' + e(T.aria_industrial) + '">' +
      '<text x="44" y="34" class="t-h">' + e(T.p1) + '</text><text x="44" y="58" class="t-s">' + e(T.p1s) + '</text>' +
      '<text x="460" y="34" class="t-h">' + e(T.p2) + '</text><text x="460" y="58" class="t-s">' + e(T.p2s) + '</text>' +
      '<text x="884" y="34" class="t-h">' + e(T.p3) + '</text><text x="884" y="58" class="t-s">' + e(T.p3s) + '</text>' +
      '<path d="M150 96H300M217 96V150" class="ln"/><rect x="196" y="150" width="42" height="26" rx="4" class="o"/><rect x="211" y="176" width="12" height="6" class="fill-ink"/>' +
      '<path d="M205 182H229L252 292H182Z" class="scan"/>' +
      '<rect x="70" y="296" width="34" height="34" class="part"/><rect x="135" y="296" width="34" height="34" class="part"/>' +
      '<rect x="200" y="296" width="34" height="34" class="bad"/><path d="M206 304L214 312L209 317L218 326" class="crack"/>' +
      '<rect x="265" y="296" width="34" height="34" class="part"/><rect x="330" y="296" width="34" height="34" class="part"/>' +
      '<rect x="44" y="332" width="356" height="16" rx="8" class="o"/>' + rollers +
      '<text x="44" y="378" class="t-s">' + e(T.vib) + '</text><path d="M44 392H400" class="alert-d"/>' +
      '<polyline points="44,414 60,410 76,418 92,408 108,416 124,411 140,417 156,409 172,415 188,410 204,416 212,386 220,440 228,412 244,415 260,409 276,416 292,410 308,415 324,408 340,416 356,411 372,415 400,412" class="signal"/>' +
      '<path d="M412 240H446M438 232L446 240L438 248" class="ln"/>' +
      '<rect x="456" y="80" width="380" height="352" rx="12" class="agent"/>' +
      '<rect x="476" y="100" width="128" height="128" rx="6" class="o"/><rect x="500" y="124" width="80" height="80" class="part"/>' +
      '<circle cx="530" cy="165" r="30" class="heat"/><path d="M512 140L528 156L518 166L536 184L530 192" class="crack"/><rect x="502" y="132" width="50" height="66" class="alert-d"/>' +
      '<text x="624" y="112" class="t-s">' + e(T.score) + '</text><path d="M624 124V220H816" class="soft"/><path d="M624 162H816" class="alert-d"/>' +
      '<polyline points="626,206 642,204 658,208 674,202 690,206 706,203 722,207 738,146 754,205 770,203 786,207 802,204 814,206" class="signal ink"/>' +
      '<circle cx="738" cy="146" r="6" class="ring"/>' +
      '<rect x="476" y="246" width="340" height="168" rx="10" class="o"/>' +
      '<text x="494" y="274" class="t-m">' + e(T.q) + '</text>' +
      '<text x="494" y="304" class="t-s t-ink">' + e(T.a1) + '</text><text x="494" y="328" class="t-s t-ink">' + e(T.a2) + '</text><text x="494" y="352" class="t-s t-ink">' + e(T.a3) + '</text>' +
      '<text x="494" y="388" class="t-m t-acc">' + e(T.act1) + '</text><text x="494" y="406" class="t-m t-acc">' + e(T.act2) + '</text>' +
      '<path d="M844 240H872M864 232L872 240L864 248" class="ln"/>' +
      '<rect x="884" y="84" width="300" height="42" rx="8" class="tag"/><text x="900" y="111" class="t-s t-ink">' + e(T.instr) + '</text>' +
      '<path d="M870 430H1180" class="soft"/><rect x="920" y="404" width="70" height="26" rx="4" class="o"/>' +
      '<path d="M955 404V300L1050 240L1104 292" class="arm-o"/><path d="M955 404V300L1050 240L1104 292" class="arm-i"/>' +
      '<circle cx="955" cy="300" r="8" class="o"/><circle cx="1050" cy="240" r="8" class="o"/>' +
      '<path d="M1104 292V302M1092 302H1116M1092 302V316M1116 302V316" class="ln w3"/>' +
      '<rect x="1092" y="318" width="24" height="24" class="bad"/><path d="M1097 323L1103 329L1099 333L1106 339" class="crack thin"/>' +
      '<rect x="1070" y="380" width="96" height="50" rx="4" class="o"/><text x="1118" y="412" class="t-s" text-anchor="middle">' + e(T.bin) + '</text>' +
      '<text x="884" y="160" class="t-m">' + e(T.j1) + '</text><text x="884" y="180" class="t-m">' + e(T.j2) + '</text>' +
      '</svg>';
  }
  function industrialLegend(T) {
    return '<div class="legend"><span><i class="k-anom"></i>' + e(T.l_anom) + '</span><span><i class="box k-vlm"></i>' + e(T.l_vlm) + '</span><span>' + e(T.l_vla) + '</span></div>';
  }
  window.ILLUSTRATIONS = { energy: energy, energyLegend: energyLegend, industrial: industrial, industrialLegend: industrialLegend };
})();
