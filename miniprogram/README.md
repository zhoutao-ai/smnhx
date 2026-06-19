# smnhx 微信小程序版

这个目录是原生微信小程序工程，保留现有 Next.js/Vercel 后端作为 API 服务。

## 导入方式

1. 打开微信开发者工具。
2. 选择“导入项目”。
3. 项目目录选择仓库里的 `miniprogram` 文件夹。
4. 把 `project.config.json` 里的 `appid` 从 `touristappid` 改成你的小程序 AppID。

## 需要配置的域名

在微信公众平台的小程序后台，把下面域名加入“开发管理 -> 开发设置 -> 服务器域名”：

- request 合法域名：`https://zwdssm.top`

当前小程序会调用这些接口：

- `POST https://zwdssm.top/api/generate`：生成命盘。
- `POST https://zwdssm.top/api/miniprogram/interpret`：非流式 AI 解读。
- `POST https://zwdssm.top/api/miniprogram/pay/create`：微信支付下单入口。

## 微信支付待配置项

支付宝 H5 不能直接用于微信小程序内支付。小程序支付必须使用微信支付，并在服务端生成 `wx.requestPayment` 所需参数。

上线前需要在 Vercel 环境变量里补齐：

- `WECHAT_MINI_APP_ID`
- `WECHAT_MCH_ID`
- `WECHAT_PAY_API_V3_KEY`
- `WECHAT_PAY_PRIVATE_KEY`
- `WECHAT_PAY_CERT_SERIAL_NO`

当前 `/api/miniprogram/pay/create` 会检测这些配置；未配置时返回 501，避免线上误以为已经接通真实支付。

## 当前页面

- `pages/index`：出生信息表单。
- `pages/chart`：命盘摘要、十二宫列表、AI 解读入口。
- `pages/pay`：2.9 元永久解锁 AI 解读命盘，预留微信支付拉起逻辑。

## 后续正式支付接入

需要补齐两步：

1. 小程序端先通过 `wx.login` 获取 `code`，服务端换取用户 `openid`。
2. 服务端调用微信支付 JSAPI 下单，签名后返回 `timeStamp`、`nonceStr`、`package`、`signType`、`paySign` 给 `wx.requestPayment`。
