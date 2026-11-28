# MJ Game

一款以爱慕杰宇宙校园篇的灭霸为主角的网页修仙沙盒。玩家可以走不同的修炼路线，干预各地争端，也可以先去别处游历。战斗使用指令回合制。

## 开始游历

[浏览器在线试玩](https://x1ehy.github.io/mj-game/)

双击 [index.html](index.html) 进入青瓦郡。游戏可以离线运行，游历和战斗都在浏览器中结算。浏览器允许本地存储时，每次行动和每个战斗回合都会自动保存。用同一浏览器从同一地址打开即可续玩。「郡中纪事」里可以查看记录或确认重开。

在 PC 山河图上，点左下角的灭霸可查看详细属性。右侧行动随所选地点变化。按 `B` 打开背包，按 `J` 查看纪事，按 `Esc` 合上面板。系统开启「减少动态效果」时，赶路和场景切换会即时完成。

地图的「追踪任务」显示下一步动作、地点和日期。点「定位」可查看路线或找到本地行动，确认动身才会赶路。在郡中纪事可切换要追踪的事，或查看已办结的结果。第五日错过田契交割后仍可申诉。水案会按剩余天数、人物行踪和手中凭据推算还能递交的方案。

在地图或战斗中，点击「清除存档」或按 `Shift + Delete` 可打开警告框。按 `Esc` 或选「保留存档」可取消。选「确认清除」会永久删除此浏览器中的当前游历，回到灭家村第一天。

点地图上的地名先看行程，再选「动身」才会过一天。「人物」里能查境界、属性、招式和突破条件。「背包」可查看随身物品、比较法器，或在地图上换装。「郡中纪事」里能查熟人今明两日的行踪。赶路、歇脚、吐纳、采草、收谷各耗一日，问话、递状和战斗不推进郡历。

| 想试的玩法 | 开局可以怎么走 |
| --- | --- |
| 保住田契 | 在灭家村向灭建国要水脚收条，到学宫翻旧档，当堂对证。再去找灭建国，他愿意引荐钢铁侠传授行气心得。 |
| 谈笔买卖 | 第一日动身去青瓦镇，次日火箭在茶棚。付钱或欠他一株引气草能留耕。买家以后会参与分成。 |
| 先修炼或战斗 | 去废渠采引气草，积攒 4 修为可突破炼气中期。打赢功德水表能拿分水令，次日到灭家村参加水费听证。 |
| 看世界自行变化 | 花四天游历或歇脚。若此前无人干预，第五日管事就来收田。之后仍可签佃约，或补齐证据和 2 灵石申诉。 |

世界规则在 [world.js](world.js)，水案的日程、提案和裁决在 [water-case.js](water-case.js)，敌方预告与伤害结算在 [encounters.js](encounters.js)，界面和存档在 [game.js](game.js)。在安装了 Node.js 的开发环境运行 `node --test` 可验证现有路线。

新手提示会在开局、领到草鞋和开始切磋时出现，可以在郡中纪事关闭或恢复。带「见闻」的地点行动会随日子和当地事务变化，完成后奖励自动入包。炼气中期后可继续修炼，累积 12 修为和 3 株引气草即可在地图上突破至炼气后期。人物页可查看进度。

### 青瓦郡的第二件事 · 水表拆了，谁来交水费？

在废渠打赢功德水表后，推进一天即可在灭家村田头见到三人。拆表后的第二天，钢铁侠去废渠查齿，火箭去青瓦镇估价，灭建国留村。第三天三人回村。第五天清晨落印，最后可以递案的是拆表后的第四天。山河图和郡中纪事会写出具体日期。旧版存档若已拆表，学宫从载入时的游戏日期起公示，玩家有完整的四天听证期。

<details>
<summary>四种水案结局与后续玩法（含剧透）</summary>

| 方案 | 资格和走法 | 结案后 |
| --- | --- | --- |
| 三户轮灌 | 向灭建国取量斗，到废渠试水，再回村交斗立约。 | 全村免水票，废渠每次能采两株引气草。 |
| 灭家免票 | 先欠下火箭那株引气草，听证时为他的包闸约作保。 | 草债勾销，灭家免票，其余农户仍缴费。既有地租照付。 |
| 学宫保修 | 曾受钢铁侠指点，找他验分水令，带签过字的验单回村。 | 学宫承担修闸费。废渠开放引流吐纳，一日得 2 修为、1 株草。 |
| 全村按茬收费 | 一直游历或修炼，到期前没有递案。 | 火箭接手水闸。灭家每次收谷扣 1 灵石水费，与地租分别结算。 |

随身量斗、验单、结案条款和已有田契都随存档保留。结案后，三人恢复平日行程。
</details>

### 青瓦郡的第一场大雨

水案落印后，回灭家村选「去祠堂檐下避雨」。檐下对话会显示双方人像，读到最后可直接决定跟钢铁侠查闸，或帮灭建国抢谷种。合上对话便回到山河图，选定路线后自动存档。四种旧判决决定谁带得来绳、绳从哪儿来。见到钢铁侠时还能打听当年是谁下令封闸。汛情告示会指明下一处地点，途中可以离开、切磋或读档再来。

开闸之后，从废渠动身回村可乘渡索，当日抵达。保住谷种后，村中公仓会雇人翻晒，一日工钱 2 灵石，失去田契也能做。郡中纪事保留水案判决、汛情进度和钢铁侠与你的这段交情。章节规则在 [first-rain.js](first-rain.js)。

祠堂对话里的钢铁侠和灭建国人像取自灭咩m的同一集，分别裁自约 4:32 和 4:44 的画面。灭霸沿用项目作者提供的蓝白校服截图。[《火箭和钢铁侠准备给灭霸一个生日惊喜》](https://www.bilibili.com/video/BV1oQsE62E1y/)

<details>
<summary>田边听证桌场景图（内置 ImageGen）</summary>

[田边听证桌](art/locations/water-hearing.webp)

> Wide Chinese woodblock narrative illustration for an absurd cultivation game's rural water hearing. An outdoor battered clerk’s table set on a rice-field embankment, a brass gear from a broken irrigation meter, an abacus, a wooden water measure with a chipped rim, red greasy thumbprints on a blank claim paper. Low side-on three-quarter view, all key props clustered at center, distant teal sluice and curving rice terraces, a little black duck standing importantly on the clerk’s stool like a witness. Carved charcoal line work, muted clay vermilion and mineral green on buff paper, closely observed tactile objects, clear silhouettes, rustic comedy. Wide horizontal panoramic composition, atmospheric mid-morning, suitable as a compact illustrated chapter banner. No typography, no people, no borders, logos, or interface.

</details>

## 沙盒方向草案

天门多年未开，各地宗门都缺灵气。仙盟开始凭名册重划灵脉，把人间学宫当成核验户籍和修为的地方。名单公布那天，灭霸发现灭建国耕了多年的灵田被登记成了无主地。乡里的争端会牵出各地宗门争夺灵脉的事，也给灭霸离开学宫、去别处修行的理由。

沙盒部分参考《鬼谷八荒》的跨地区探索、修炼路线和会自主行动的人物。[《鬼谷八荒》Steam 介绍](https://store.steampowered.com/app/1468810/_Tale_of_Immortal/?l=schinese)

### 玩家怎样度过一天

- **探索和修炼。** 去镇上交易、去废渠采集、闭关练功，或拜师进宗门。赶路和修炼推动日期。散修和宗门弟子可从不同渠道获得功法与突破材料。
- **和人物打交道。** 人物有去处、想做的事和自己信得过的人。火箭浣熊可能先把线索卖给别人，钢铁侠也会按日程离开学宫。帮过谁、欠过谁的人情，会影响后续能请动谁。
- **决定如何插手。** 可以谈条件、查证据、切磋或完全绕开一件事。事件到期后由在场人物继续推进。局势变化要体现在下次见面、地图资源或可用选项上。
- **打完拿东西。** 功法和法器改变回合指令，掉落能装配、交易或作为剧情凭证。用战利品突破境界后，可以去更远的地方。

### 第一块区域

地图先做灭家村、青瓦镇、学宫和废渠。首个争端是「第五天交割灵田」。玩家从第一天起就可以在村里修炼、去废渠采集、四处打听，或直接去见掌握名册的人。

| 玩家选择 | 世界变化 |
| --- | --- |
| 查旧档，找到能对证的地契 | 学宫撤销登记，灭建国保住灵田，也愿意介绍自己的故交。 |
| 找火箭牵线，跟买家谈条件 | 可以花灵石或欠一个人情换回使用权，但买家保留部分收益。 |
| 到废渠迎战占据水源的人 | 打赢后能重开灌渠，获得一件可装备的法器。地契争端依旧可以再去交涉。 |
| 闭关或游历，错过交割 | 买家接管灵田，回村时会看到新的管事和租用条件，之后仍能交涉。 |

### 开发顺序

1. 做能自由进出的四处地点和世界日期。走路、修炼或休息能过日，人物按日程移动，到了交割日就结算。
2. 加入可带走的证据、能交换的灵石和人情，以及能打完拿掉落的废渠遭遇。让同一个争端对不同做法给出可见的结果。
3. 加入境界突破、关系和存档。试玩要能证明玩家可以先修炼再处理争端，走不同途径后回村会看到不同结果，错过争端也能继续探索。

### 角色美术参考

灭霸穿蓝白校服，形象来自项目作者提供并确认可公开使用的两张校园篇截图。地图、人物档案、听证对白和战斗使用同一组图。战斗中保留到上半身的画幅，小头像聚焦眉眼和下巴纹。[板脸截图](art/characters/thanos-campus-stern.png) · [大笑截图](art/characters/thanos-campus-laugh.png)

战场上，灭霸在左侧迎敌，双方血条在上方，招式排列在场地下方。出手时的前倾姿势和肩臂轮廓参考了校园篇的画面。[《灭霸开大了》](https://www.bilibili.com/video/BV1vFnb6tEs7) · [《灭霸上课太不老实了》](https://www.bilibili.com/video/BV1ZqxN6kETy)

## 当前可选遭遇

到废渠选「上试锤台单挑托尔」即可切磋。水案落印后，入口叫「陪雷神验闸」。切磋不耗郡历，首次胜利掉落雷纹铁扣，可回地图换装再战。托尔先暗中选招，玩家再选招。双方按招式优先度出手，同档比较身法，同速随机。先手打倒对方即可结束本回合。刷新会保留敌方选招。

托尔花一回合举锤聚雷，下一回合必须落锤，落锤优先度为 −1。响指可抢先打断，引水诀可一边攻击一边打断，架盖接住重击后可以反震。普通锤招和换气在出手时揭晓。空手或佩戴分水令时，沉肩还手能减轻近身锤招并回击。

| 角色 | 体力或架势 | 攻击 | 防御 | 身法 |
| --- | ---: | ---: | ---: | ---: |
| 灭霸 · 炼气初期 | 10,000 | 3,000 | 1,200 | 200 |
| 灭霸 · 炼气中期 | 24,000 | 6,000 | 2,400 | 400 |
| 托尔 | 16,000 | 3,200 | 1,000 | 300 |

基础伤害取「攻击 + 招式威力 − 对方防御」，保底为攻击的 5%，向上取整。炼气初、中、后期的术法威力分别为 2,000、4,000、5,000。引水诀附加一倍术法威力，反震附加两倍。普攻抓到破绽可额外附加一倍术法威力。裂纹炉盖在每场首次受击时，最多抵消自身体力上限的四成。忽略装备加成与破绽，三个境界普攻托尔分别打 2,000、5,000、6,800 点。

学宫炼丹房里可以挑战考勤丹炉，废渠闸口可以挑战功德水表。先读对手预告，再选普通攻击、打响指或已装备法器的指令。打赢后掉落自动入包，每场遭遇只掉落一次。裂纹炉盖能减轻每场战斗的第一次伤害。分水令提供引水诀，能同时攻击和打断。失败可以重试，也可回到地图继续游历。

战斗动画按实际出手顺序播放。命中时会浮出伤害数字，血条随之回落。托尔举锤聚雷后，锤头会亮起。点「跳过动画」可立即进入下一次选招，开启系统的减少动态效果时会直接显示结算。在水案听证中，灭霸会根据手里的凭据或欠下的人情接一句话。

### 装备与丹药

人物页有头部、身体、裤子、鞋子、配饰、武器六个部位。点一个部位可打开对应的背包筛选。不同部位的加成同时生效，换装只替换同部位，出战期间锁定穿戴。裂纹炉盖与分水令同属手持武器，分别提供架盖反震和引水诀。旧存档会将原来穿戴的物品迁入对应部位。

| 物品 | 获取与用途 |
| --- | --- |
| 丹房护头帽 | 打赢考勤丹炉后在学宫库房领取。头部，防御 +200。 |
| 渡口下田裤 | 修好田埂后回灭家村渡口领取。裤子，体力上限 +1,200。 |
| 踩泥草鞋 | 在灭家村帮灭建国修田埂，耗时 1 日。装备后身法 +120。 |
| 补过三回的校服 | 火箭在青瓦镇时花 5 灵石购买。装备后防御 +600。 |
| 雷纹铁扣 | 废渠首次赢下托尔时掉落。装备后攻击 +700。 |
| 丹房退货单 | 打赢考勤丹炉后找钢铁侠开单。交给镇上的火箭换 4 灵石，或在学宫库房换 2 枚回气丸。 |
| 回气丸 | 青瓦镇药摊每枚 2 灵石。服药占一回合，恢复 1 点灵力，优先度为 0。若先被打倒，药丸留在背包里。 |

<details>
<summary>本版地图与闸口原画（内置 ImageGen）</summary>

[青瓦郡地图](art/locations/qingwa-atlas.webp) 上的地点标记由网页叠加。[功德水表](art/locations/sluice.webp) 在废渠战斗时出场。

地图生成提示词

> Stylized-concept. Full-bleed landscape 3:2, a beautiful playable regional atlas base map for an original Chinese cultivation browser game. Very legible oblique aerial view, antique Chinese woodblock topography, delicate graphite black contours, mineral verdigris blue-green river on warm ivory paper, ochre rice terraces, slate mountains, tiny vermilion accents. Four prominent places laid out on one connected landscape: lower left around (24%,68%) a tiny farming village with walled terraced paddy plots; upper left around (30%,34%) a roofed riverside market town and small bridge; upper right around (74%,28%) a mountain academy compound with courtyards; lower right around (70%,70%) an old ruined canal lock with a wooden wheel. A sinuous wide blue-green river crosses from top center toward bottom center, walkable trails thread between the settlements, densely etched mountains near outer edges, a few pines. Entire frame is richly drawn land like a surviving field survey print. No sky, absolutely no text or lettering, no border, no seals, no icons, no labels, no interface or person. The web game will add interactive markers separately.

闸口生成提示词

> Stylized-concept, a full-bleed wide 3:2 illustrated encounter background for a Chinese fantasy comedy videogame. At an abandoned stone irrigation lock, an absurd mechanical toll collector is blocking the flow: an ancient turquoise bronze coin donation box on two chunky stone feet, red temple cords, a clattering abacus across its chest, one bent brass ladle raised like a little fist, a few square-holed copper coins. This contraption is the specific enemy. Compose it clearly on the RIGHT third of frame, filling about 55% of picture height. Leave LEFT foreground entirely empty, dark enough for a player cutout overlay. Pale stone spillway, mossy aqueduct, gray-green hills, muddy teal water and russet ropes; low-angle side-on stage. Strong dark ink lines, restrained mineral colors, aged cheap Chinese woodblock-comic print with distinctive etched hatching, readable silhouettes. No actual words, letters, characters, labels, UI, watermark or frame. No people in painting.

</details>

## 学宫丹炉事件草案

**《你的筑基申请被丹炉驳回了》**

火箭浣熊把丹炉接上宗门考勤系统，丹炉错判灭霸旷课，开始喷扣分符。开打前，玩家可以直接去炼丹房，也可以先找钢铁侠补签请假条。拿到请假条后，仍可以选择怎么结束战斗。

### 初版首战草案（历史数值）

首版数值用于试玩。灭霸有 5 点体力、2 点灵力，丹炉有 6 层外壳。每回合先显示丹炉下一招，玩家选指令并结算，战斗继续时再结算丹炉行动。丹炉按「喷扣分符 → 复核考勤 → 开盖散热」循环，喷符扣 3 点体力。

| 指令 | 效果 |
| --- | --- |
| 拍炉盖 | 打掉 1 层外壳。丹炉准备开盖散热时打掉 2 层。 |
| 打响指 | 免费打断本回合的扣分符，用后两个回合冷却。 |
| 出示请假条 | 持有已补签的请假条，并且丹炉准备复核时可用。丹炉撤销处分，战斗结束。 |

- **拆掉丹炉**会获得裂纹炉盖，可在下场战斗挡一次重击。查寝时，炼丹房会来追问赔偿。
- **撤销处分**会获得盖章回执，查寝时可以用它抵一次扣分。
- **打输了**可以从开战前重试，补签结果保留，本场体力和灵力恢复。

### 事件完成条件

- [x] 直接开打能靠读敌方预告拆炉，拿到裂纹炉盖。
- [ ] 先补签、等到复核时亮出请假条，能结束战斗并拿到盖章回执。
- [ ] 两种结局都能接到查寝，奖励会影响查寝结果。
- [ ] 失败能重试。完成首章后刷新，保留结局与奖励，也能主动开新局。

### 丹炉事件美术

丹炉、道具和炼丹房沿用二维校园漫画的画法。用粗墨线、平涂色块和少量旧印刷颗粒，配色以暖米白、墨黑、铜绿为主，朱红留给警示、扣分和印章。画面用古式法器和日常校务用品的组合来表现反差。

- 首章准备灭霸与钢铁侠的半身像、考勤丹炉立绘、炼丹房背景，以及炉盖和回执两枚图标。火箭浣熊可以先从对话里出场。补签和查寝先用同一套纸面对白样式。
- 对话与战斗共用立绘。战斗中的喷符、复核、散热先用文字预告和符纸、印章、蒸汽动效区分，战斗结果由程序结算。
- 新图沿用 [考勤丹炉样稿](art/concepts/attendance-furnace.png) 的线条、配色和纹理。先确认缩到手机上的实际尺寸后仍能读懂轮廓，再上细节。

<details>
<summary>考勤丹炉生成提示词（内置 ImageGen）</summary>

原创网页回合制游戏敌方立绘，《修仙宗门的考勤丹炉》。单个完整物件，方形画布，透明背景，无地面；略带三分之四角度的正视。圆肚三足青铜丹炉，厚重独立感强的炉盖，侧面用绳子绑着学校考勤打卡机；机身只有暗红色警示灯和吐出一角空白符纸的窄缝。看起来像一件一本正经管纪律的古董。画成廉价校园漫画贴纸，粗墨线、平涂块面、少量旧印刷颗粒，墨黑、铜绿、暖米白，朱红少量点缀。轮廓夸张，缩小到手机屏幕约 140 像素仍一眼能认出丹炉和打卡机。四周留足透明留白，完整不裁切，无字、无标志、无水印。

</details>

<details>
<summary>炼丹房背景生成提示词（内置 ImageGen）</summary>

Wide landscape background art only for an original Chinese cultivation school browser game, stylized-concept, 3:2 composition that can crop near the center. A quiet, slightly absurd academy alchemy room after classes, viewed low and straight-on with balanced near symmetry. Empty open floor and empty central foreground for a game enemy sprite added later; at center back, a tall lattice window with faint dusty warm light. Against the far left and right walls, old wooden cabinets, a few medicine jars, a humble table, blank hanging slips and a subtly incongruous attendance punch clock. Thick dark ink contours, flat color shapes and restrained aged print texture like a low-budget hand-illustrated Chinese campus comic. Deep muted charcoal and teal-green interior, subtle dusty cream window light, sparing rusty red rope details, no bright highlights in front. Legible large shapes, edges soft in value, richly observed details along sides, intentionally quiet in middle. No people, creatures, cauldrons, characters, text, signs bearing script, logos, UI, borders, or watermark. The result must be an opaque raster backdrop, not a mockup.

</details>
