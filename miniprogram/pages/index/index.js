const { generateChart } = require('../../utils/api');
const { range, isValidDate, toHourBranch } = require('../../utils/date');

const BRANCH_NAMES = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'];

Page({
  data: {
    years: range(1900, 2026).reverse(),
    months: range(1, 12),
    days: range(1, 31),
    hours: range(0, 23),
    minutes: range(0, 59),
    yearIndex: 0,
    monthIndex: 0,
    dayIndex: 0,
    hourIndex: 8,
    minuteIndex: 0,
    branchName: '辰',
    loading: false,
    form: {
      name: '',
      year: '',
      month: '',
      day: '',
      clockHour: '8',
      clockMinute: '0',
      gender: 'male',
      city: ''
    }
  },

  onLoad() {
    this.updateBranch();
  },

  onInput(event) {
    const key = event.currentTarget.dataset.key;
    this.setData({
      [`form.${key}`]: event.detail.value
    });
  },

  onPickerChange(event) {
    const key = event.currentTarget.dataset.key;
    const index = Number(event.detail.value);
    const ranges = {
      year: this.data.years,
      month: this.data.months,
      day: this.data.days,
      clockHour: this.data.hours,
      clockMinute: this.data.minutes
    };
    const indexKeys = {
      year: 'yearIndex',
      month: 'monthIndex',
      day: 'dayIndex',
      clockHour: 'hourIndex',
      clockMinute: 'minuteIndex'
    };

    this.setData({
      [indexKeys[key]]: index,
      [`form.${key}`]: ranges[key][index]
    }, () => this.updateBranch());
  },

  onGenderTap(event) {
    this.setData({
      'form.gender': event.currentTarget.dataset.gender
    });
  },

  updateBranch() {
    const branch = toHourBranch(this.data.form.clockHour, this.data.form.clockMinute);
    this.setData({ branchName: BRANCH_NAMES[branch] });
  },

  async onSubmit() {
    const form = this.data.form;
    const year = Number(form.year);
    const month = Number(form.month);
    const day = Number(form.day);

    if (!year || !month || !day || !isValidDate(year, month, day)) {
      wx.showToast({ title: '请填写正确日期', icon: 'none' });
      return;
    }

    const birthInfo = {
      year,
      month,
      day,
      hour: toHourBranch(form.clockHour, form.clockMinute),
      gender: form.gender,
      name: form.name || undefined,
      city: form.city || undefined
    };

    this.setData({ loading: true });
    try {
      const chart = await generateChart(birthInfo);
      const app = getApp();
      app.globalData.chart = chart;
      app.globalData.birthInfo = birthInfo;
      wx.navigateTo({ url: '/pages/chart/chart' });
    } catch (error) {
      wx.showToast({ title: error.message || '起盘失败', icon: 'none' });
    } finally {
      this.setData({ loading: false });
    }
  }
});
