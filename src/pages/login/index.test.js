describe('pages/login/index', () => {
  let page;

  beforeAll(async () => {
    page = await program.reLaunch('/pages/login/index');
    await page.waitFor(1000);
  });

  it('should display login page correctly', async () => {
    const logo = await page.$('.logo');
    expect(logo).toBeTruthy();
  });

  it('should display username and password inputs', async () => {
    const inputs = await page.$$('.input');
    expect(inputs.length).toBe(2);
  });

  it('should display login button', async () => {
    const loginBtn = await page.$('.login-btn');
    expect(loginBtn).toBeTruthy();
  });

  it('should show error when submitting empty form', async () => {
    const loginBtn = await page.$('.login-btn');
    await loginBtn.tap();
    await page.waitFor(500);
    
    const errorMsg = await page.$('.error-message');
    expect(errorMsg).toBeTruthy();
  });

  it('should login successfully with valid credentials', async () => {
    const inputs = await page.$$('.input');
    const usernameInput = inputs[0];
    const passwordInput = inputs[1];
    
    await usernameInput.input('riku');
    await passwordInput.input('123456');
    await page.waitFor(500);
    
    const loginBtn = await page.$('.login-btn');
    await loginBtn.tap();
    await page.waitFor(2000);
    
    const currentPage = await program.currentPage();
    expect(currentPage.path).toContain('pages/index/index');
  });
});
