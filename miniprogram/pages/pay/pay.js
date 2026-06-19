const { createWxPayOrder } = require('../../utils/api');

Page({
  data: {
    loading: false
  },

  async onPay() {
    this.setData({ loading: true });
    try {
      const login = await new Promise((resolve, reject) => {
        wx.login({
          success: resolve,
          fail: reject
        });
      });
      const result = await createWxPayOrder(login.code);
      if (!result.success || !result.payment) {
        throw new Error(result.error || '微信支付暂未配置');
      }

      wx.requestPayment({
        ...result.payment,
        success: () => {
          wx.setStorageSync('ai_reading_unlocked', true);
          wx.showToast({ title: '解锁成功', icon: 'success' });
          setTimeout(() => wx.navigateBack(), 600);
        },
        fail: (error) => {
          wx.showToast({ title: error.errMsg || '支付未完成', icon: 'none' });
        }
      });
    } catch (error) {
      wx.showModal({
        title: '支付暂未可用',
        content: error.message || '请先完成微信商户配置',
        showCancel: false
      });
    } finally {
      this.setData({ loading: false });
    }
  }
});
