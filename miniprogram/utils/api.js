const BASE_URL = 'https://zwdssm.top';

function request(path, options = {}) {
  return new Promise((resolve, reject) => {
    wx.request({
      url: `${BASE_URL}${path}`,
      method: options.method || 'GET',
      data: options.data || {},
      header: {
        'content-type': 'application/json',
        ...(options.header || {})
      },
      success(res) {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve(res.data);
          return;
        }
        const message = res.data && res.data.error ? res.data.error : `请求失败 ${res.statusCode}`;
        reject(new Error(message));
      },
      fail(err) {
        reject(new Error(err.errMsg || '网络请求失败'));
      }
    });
  });
}

function generateChart(birthInfo) {
  return request('/api/generate', {
    method: 'POST',
    data: birthInfo
  });
}

function interpretChart(chart, question) {
  return request('/api/miniprogram/interpret', {
    method: 'POST',
    data: {
      chart,
      messages: [
        {
          role: 'user',
          content: question || '请解读我的命盘'
        }
      ]
    }
  });
}

function createWxPayOrder(code) {
  return request('/api/miniprogram/pay/create', {
    method: 'POST',
    data: { code }
  });
}

module.exports = {
  BASE_URL,
  generateChart,
  interpretChart,
  createWxPayOrder
};
