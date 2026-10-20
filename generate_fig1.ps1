Add-Type -AssemblyName System.Drawing

$width = 1300
$height = 850
$bmp = New-Object System.Drawing.Bitmap($width, $height)
$g = [System.Drawing.Graphics]::FromImage($bmp)
$g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
$g.TextRenderingHint = [System.Drawing.Text.TextRenderingHint]::ClearTypeGridFit

$g.Clear([System.Drawing.Color]::White)

# Bold Pens (2.5px to 3.5px)
$penOuter = New-Object System.Drawing.Pen([System.Drawing.Color]::Black, 3.5)
$penBox = New-Object System.Drawing.Pen([System.Drawing.Color]::Black, 2.5)
$penDotted = New-Object System.Drawing.Pen([System.Drawing.Color]::Black, 2.5)
$penDotted.DashPattern = @(4.0, 3.0)

# Brushes
$brushBlack = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::Black)
$brushGrey = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(215, 220, 226))

# Bold, High-Legibility Fonts
$fontOuter = New-Object System.Drawing.Font("Arial", 13.5, [System.Drawing.FontStyle]::Bold)
$fontSection = New-Object System.Drawing.Font("Arial", 12.0, [System.Drawing.FontStyle]::Bold)
$fontBoxBold = New-Object System.Drawing.Font("Arial", 11.0, [System.Drawing.FontStyle]::Bold)
$fontBoxSub = New-Object System.Drawing.Font("Arial", 10.5, [System.Drawing.FontStyle]::Bold)
$fontLabel = New-Object System.Drawing.Font("Arial", 10.5, [System.Drawing.FontStyle]::Bold)
$fontBottomTitle = New-Object System.Drawing.Font("Arial", 12.0, [System.Drawing.FontStyle]::Bold)
$fontBottomBullets = New-Object System.Drawing.Font("Arial", 11.0, [System.Drawing.FontStyle]::Bold)

$sfCenter = New-Object System.Drawing.StringFormat
$sfCenter.Alignment = [System.Drawing.StringAlignment]::Center
$sfCenter.LineAlignment = [System.Drawing.StringAlignment]::Center

$sfLeft = New-Object System.Drawing.StringFormat
$sfLeft.Alignment = [System.Drawing.StringAlignment]::Near
$sfLeft.LineAlignment = [System.Drawing.StringAlignment]::Center

# --- OUTER CONTAINER: Theoretical Foundations ---
$rectOuter = New-Object System.Drawing.Rectangle(60, 35, 1180, 320)
$g.DrawRectangle($penOuter, $rectOuter)
$g.DrawString("Theoretical Foundations", $fontOuter, $brushBlack, 650, 58, $sfCenter)

# Left Container: Information Systems Theory
$rectIS = New-Object System.Drawing.Rectangle(85, 85, 380, 250)
$g.DrawRectangle($penBox, $rectIS)
$g.DrawString("Information Systems Theory", $fontSection, $brushBlack, 275, 110, $sfCenter)

# DeLone & McLean Box
$rectDelone = New-Object System.Drawing.Rectangle(105, 140, 340, 175)
$g.DrawRectangle($penBox, $rectDelone)
$strDelone = "DeLone & McLean IS`nSuccess Model`n`n(System Quality &`nInformation Quality)"
$g.DrawString($strDelone, $fontBoxBold, $brushBlack, (New-Object System.Drawing.RectangleF(110, 150, 330, 155)), $sfCenter)

# Right Container: Veterinary & Public Health Theories
$rectVet = New-Object System.Drawing.Rectangle(485, 85, 730, 250)
$g.DrawRectangle($penBox, $rectVet)
$g.DrawString("Veterinary & Public Health Theories", $fontSection, $brushBlack, 850, 110, $sfCenter)

# One Health Framework Box
$rectOneHealth = New-Object System.Drawing.Rectangle(510, 145, 325, 170)
$g.DrawRectangle($penBox, $rectOneHealth)
$strOneHealth = "One Health Framework`n`n(Human-Animal-`nEnvironment Link)"
$g.DrawString($strOneHealth, $fontBoxBold, $brushBlack, (New-Object System.Drawing.RectangleF(515, 155, 315, 150)), $sfCenter)

# Epidemiological Triad Box
$rectTriad = New-Object System.Drawing.Rectangle(865, 145, 325, 170)
$g.DrawRectangle($penBox, $rectTriad)
$strTriad = "Epidemiological Triad`n`n(Agent-Host-`nEnvironment)"
$g.DrawString($strTriad, $fontBoxBold, $brushBlack, (New-Object System.Drawing.RectangleF(870, 155, 315, 150)), $sfCenter)

# --- ARROW CONNECTIONS ---
$cap = New-Object System.Drawing.Drawing2D.AdjustableArrowCap(8, 8, $true)

# Left Arrow (Solid): from bottom of Information Systems Theory down to Bottom Box
$penArrowSolid = New-Object System.Drawing.Pen([System.Drawing.Color]::Black, 3.0)
$penArrowSolid.CustomEndCap = $cap
$g.DrawLine($penArrowSolid, 275, 335, 275, 530)

# Grey Label on Left Arrow: "Information system foundation"
$rectPill1 = New-Object System.Drawing.Rectangle(150, 415, 250, 40)
$g.FillRectangle($brushGrey, $rectPill1)
$g.DrawRectangle($penBox, $rectPill1)
$g.DrawString("Information system foundation", $fontLabel, $brushBlack, 275, 435, $sfCenter)

# Right Arrow (Dotted): from bottom of Right Container down, left, and down into Bottom Box
$penArrowDotted = New-Object System.Drawing.Pen([System.Drawing.Color]::Black, 3.0)
$penArrowDotted.DashPattern = @(4.0, 3.0)
$penArrowDotted.CustomEndCap = $cap

# Pathway: (850, 335) -> (850, 440) -> (365, 440) -> (365, 530)
$g.DrawLine($penDotted, 850, 335, 850, 440)
$g.DrawLine($penDotted, 850, 440, 365, 440)
$g.DrawLine($penArrowDotted, 365, 440, 365, 530)

# Grey Label on Right Arrow: "Health knowledge"
$rectPill2 = New-Object System.Drawing.Rectangle(660, 420, 180, 40)
$g.FillRectangle($brushGrey, $rectPill2)
$g.DrawRectangle($penBox, $rectPill2)
$g.DrawString("Health knowledge", $fontLabel, $brushBlack, 750, 440, $sfCenter)

# --- BOTTOM BOX: FarmAlert System ---
$rectBottom = New-Object System.Drawing.Rectangle(170, 530, 380, 260)
$g.DrawRectangle($penOuter, $rectBottom)

# Title inside Bottom Box
$rectBottomTitle = New-Object System.Drawing.RectangleF(180, 545, 360, 75)
$strBottomTitle = "FarmAlert`nWeb-Based Disease Surveillance &`nBiosecurity Compliance Monitoring"
$g.DrawString($strBottomTitle, $fontBottomTitle, $brushBlack, $rectBottomTitle, $sfCenter)

# Divider
$penDiv = New-Object System.Drawing.Pen([System.Drawing.Color]::Black, 1.5)
$g.DrawLine($penDiv, 195, 630, 525, 630)

# Bullets inside Bottom Box
$rectBullets = New-Object System.Drawing.RectangleF(190, 645, 350, 135)
$strBullets = "• Real-Time Disease Surveillance`n`n• On-Farm Biosecurity Compliance`n`n• LGU Proactive Decision Making"
$g.DrawString($strBullets, $fontBottomBullets, $brushBlack, $rectBullets, $sfLeft)

# Save image
$outPath = "c:\Users\Cedrick\farm-alert\Figure_1_1_Theoretical_Framework.png"
$bmp.Save($outPath, [System.Drawing.Imaging.ImageFormat]::Png)
$g.Dispose()
$bmp.Dispose()
Write-Output "SUCCESS: Bold high-contrast image generated at $outPath"
