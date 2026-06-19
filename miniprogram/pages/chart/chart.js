const { interpretChart } = require('../../utils/api');

function normalizePalaces(chart) {
  return (chart.palaces || []).map((palace) => {
    const stars = (palace.stars || []).filter((star) => star.type === 'major');
    return {
      ...palace,
      ageText: palace.daXianAge ? `${palace.daXianAge[0]}-${palace.daXianAge[1]}岁` : '',
      starsText: stars.length ? stars.map((star) => star.name).join('、') : '空宫，参考对宫'
    };
  });
}

Page({
  data: {
    chart: null,
    palaces: [],
    birthLabel: '',
    question: '',
    answer: '',
    unlocked: false,
    interpreting: false
  },

  onShow() {
    const app = getApp();
    const chart = app.globalData.chart;
    const birth = app.globalData.birthInfo;
    this.setData({
      chart,
      palaces: chart ? normalizePalaces(chart) : [],
      birthLabel: birth ? `${birth.year}年${birth.month}月${birth.day}日` : '紫微命盘',
      unlocked: wx.getStorageSync('ai_reading_unlocked') === true
    });
  },

  onQuestionInput(event) {
    this.setData({ question: event.detail.value });
  },

  goHome() {
    wx.redirectTo({ url: '/pages/index/index' });
  },

  goPay() {
    wx.navigateTo({ url: '/pages/pay/pay' });
  },

  async onInterpret() {
    if (!this.data.unlocked) {
      this.goPay();
      return;
    }

    const question = this.data.question.trim() || '追问：我的感情和事业如何走向';
    this.setData({ interpreting: true, answer: '' });
    try {
      const result = await interpretChart(this.data.chart, question);
      this.setData({ answer: result.text || '暂无解读结果' });
    } catch (error) {
      wx.showToast({ title: error.message || '解读失败', icon: 'none' });
    } finally {
      this.setData({ interpreting: false });
    }
  }
});
