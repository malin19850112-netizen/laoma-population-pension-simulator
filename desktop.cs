using System;
using System.IO;
using System.Diagnostics;
using System.Windows.Forms;
class YuejianNational {
 [STAThread] static void Main() {
  string root=AppDomain.CurrentDomain.BaseDirectory;
  string html=Path.Combine(root,"app","index.html");
  string edge=Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.ProgramFilesX86),"Microsoft","Edge","Application","msedge.exe");
  if(!File.Exists(edge)) edge=Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.ProgramFiles),"Microsoft","Edge","Application","msedge.exe");
  if(!File.Exists(edge)||!File.Exists(html)){MessageBox.Show("未找到 Microsoft Edge 或 app 文件夹。请保留完整应用目录。","人口与养老金情景模拟器 · 公开准备版 · 无法启动");return;}
  string profile=Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData),"YuejianPublic","Profile");
  try {Process.Start(new ProcessStartInfo {FileName=edge,Arguments="--app=\""+new Uri(html).AbsoluteUri+"?v=45.0-public#map\" --user-data-dir=\""+profile+"\" --no-first-run --no-default-browser-check --window-size=1500,1050",UseShellExecute=false,WorkingDirectory=root});}
  catch(Exception e){MessageBox.Show("启动失败："+e.Message,"人口与养老金情景模拟器 · 公开准备版");}
 }
}

