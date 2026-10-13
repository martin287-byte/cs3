--[[
	Grass Painter — Roblox Studio local plugin

	Install: Studio > Plugins tab > Plugins Folder, drop this file in, restart Studio.
	Source:  the imported grass model, named "GrassPack", in ServerStorage
	         (or Workspace). Every MeshPart inside it is a paintable variant.

	Click / drag   paint grass on Terrain or Parts
	Ctrl + drag    erase grass under the brush
	[  /  ]        shrink / grow the brush

	Painted grass goes into Workspace.Grass. Every stroke is one undo step.
]]

local ChangeHistoryService = game:GetService("ChangeHistoryService")
local ServerStorage = game:GetService("ServerStorage")
local UserInputService = game:GetService("UserInputService")

local SETTINGS_KEY = "GrassPainter_v1"

local cfg = {
	radius = 6,       -- brush radius (studs)
	count = 6,        -- tufts placed per dab
	spacing = 1.2,    -- min distance between tufts
	minScale = 0.8,
	maxScale = 1.3,
	sink = 0.15,      -- push roots into the ground so they never float
	alignToSlope = true,
	shadows = false,  -- CastShadow on painted grass (off is much cheaper)
	disabled = {},    -- variant names switched off in the panel
}
do
	local saved = plugin:GetSetting(SETTINGS_KEY)
	if type(saved) == "table" then
		for k, v in pairs(saved) do
			cfg[k] = v
		end
	end
end
local function saveCfg()
	plugin:SetSetting(SETTINGS_KEY, cfg)
end

-------------------------------------------------------------------- source --
local function findPack()
	return ServerStorage:FindFirstChild("GrassPack") or workspace:FindFirstChild("GrassPack")
end

local function variants()
	local pack = findPack()
	local list = {}
	if pack then
		for _, d in ipairs(pack:GetDescendants()) do
			if d:IsA("MeshPart") and not cfg.disabled[d.Name] then
				table.insert(list, d)
			end
		end
	end
	return list
end

local function grassFolder()
	local f = workspace:FindFirstChild("Grass")
	if not f then
		f = Instance.new("Folder")
		f.Name = "Grass"
		f.Parent = workspace
	end
	return f
end

----------------------------------------------------------------------- UI --
local toolbar = plugin:CreateToolbar("Grass")
local button = toolbar:CreateButton("Grass Painter", "Paint grass tufts onto terrain and parts", "")
button.ClickableWhenViewportHidden = false

local widget = plugin:CreateDockWidgetPluginGui("GrassPainter", DockWidgetPluginGuiInfo.new(
	Enum.InitialDockState.Right, false, false, 260, 420, 220, 300))
widget.Title = "Grass Painter"

local root = Instance.new("ScrollingFrame")
root.Size = UDim2.fromScale(1, 1)
root.BackgroundColor3 = Color3.fromRGB(37, 37, 37)
root.BorderSizePixel = 0
root.AutomaticCanvasSize = Enum.AutomaticSize.Y
root.CanvasSize = UDim2.new()
root.ScrollBarThickness = 6
root.Parent = widget
local pad = Instance.new("UIPadding")
pad.PaddingLeft, pad.PaddingRight, pad.PaddingTop = UDim.new(0, 8), UDim.new(0, 8), UDim.new(0, 8)
pad.Parent = root
local layout = Instance.new("UIListLayout")
layout.Padding = UDim.new(0, 4)
layout.SortOrder = Enum.SortOrder.LayoutOrder
layout.Parent = root

local order = 0
local function row(height)
	order += 1
	local f = Instance.new("Frame")
	f.Size = UDim2.new(1, 0, 0, height or 24)
	f.BackgroundTransparency = 1
	f.LayoutOrder = order
	f.Parent = root
	return f
end

local function label(parent, text, size)
	local l = Instance.new("TextLabel")
	l.Size = size or UDim2.new(0.6, 0, 1, 0)
	l.BackgroundTransparency = 1
	l.Text = text
	l.TextColor3 = Color3.fromRGB(220, 220, 220)
	l.TextXAlignment = Enum.TextXAlignment.Left
	l.Font = Enum.Font.SourceSans
	l.TextSize = 15
	l.TextWrapped = true
	l.Parent = parent
	return l
end

local function numberField(text, key, minV, maxV)
	local f = row()
	label(f, text)
	local box = Instance.new("TextBox")
	box.Size = UDim2.new(0.4, 0, 1, 0)
	box.Position = UDim2.fromScale(0.6, 0)
	box.BackgroundColor3 = Color3.fromRGB(55, 55, 55)
	box.BorderSizePixel = 0
	box.TextColor3 = Color3.new(1, 1, 1)
	box.Font = Enum.Font.SourceSans
	box.TextSize = 15
	box.Text = tostring(cfg[key])
	box.Parent = f
	box.FocusLost:Connect(function()
		local n = tonumber(box.Text)
		if n then
			cfg[key] = math.clamp(n, minV, maxV)
			saveCfg()
		end
		box.Text = tostring(cfg[key])
	end)
	return box
end

local function toggle(text, getter, setter)
	local f = row()
	local b = Instance.new("TextButton")
	b.Size = UDim2.fromScale(1, 1)
	b.BorderSizePixel = 0
	b.Font = Enum.Font.SourceSans
	b.TextSize = 15
	b.TextXAlignment = Enum.TextXAlignment.Left
	b.Parent = f
	local function refresh()
		local on = getter()
		b.Text = (on and "  [x]  " or "  [  ]  ") .. text
		b.BackgroundColor3 = on and Color3.fromRGB(46, 84, 46) or Color3.fromRGB(55, 55, 55)
		b.TextColor3 = Color3.new(1, 1, 1)
	end
	b.MouseButton1Click:Connect(function()
		setter(not getter())
		saveCfg()
		refresh()
	end)
	refresh()
	return f
end

local status = label(row(40), "", UDim2.fromScale(1, 1))
local radiusBox = numberField("Brush radius", "radius", 1, 100)
numberField("Tufts per dab", "count", 1, 50)
numberField("Min spacing", "spacing", 0, 20)
numberField("Min scale", "minScale", 0.1, 10)
numberField("Max scale", "maxScale", 0.1, 10)
numberField("Root sink", "sink", 0, 2)
toggle("Align to slope", function() return cfg.alignToSlope end, function(v) cfg.alignToSlope = v end)
toggle("Cast shadows", function() return cfg.shadows end, function(v) cfg.shadows = v end)
label(row(20), "Variants:", UDim2.fromScale(1, 1))

local variantRows = {}
local function rebuildVariantList()
	for _, r in ipairs(variantRows) do
		r:Destroy()
	end
	variantRows = {}
	local pack = findPack()
	if not pack then
		status.Text = "No GrassPack found. Import GrassPack.fbx and put the model in ServerStorage named \"GrassPack\"."
		status.TextColor3 = Color3.fromRGB(255, 170, 90)
		return
	end
	local n = 0
	for _, d in ipairs(pack:GetDescendants()) do
		if d:IsA("MeshPart") then
			n += 1
			local name = d.Name
			table.insert(variantRows, toggle(name,
				function() return not cfg.disabled[name] end,
				function(v) cfg.disabled[name] = (not v) or nil end))
		end
	end
	status.Text = ("%d variants from %s. Click to paint, Ctrl+drag to erase, [ ] brush size."):format(n, pack:GetFullName())
	status.TextColor3 = Color3.fromRGB(160, 220, 160)
end

------------------------------------------------------------------- brush --
local brush = Instance.new("Part")
brush.Name = "GrassBrush"
brush.Shape = Enum.PartType.Cylinder
brush.Anchored = true
brush.CanCollide = false
brush.CanQuery = false
brush.CanTouch = false
brush.CastShadow = false
brush.Material = Enum.Material.Neon
brush.Transparency = 0.75
brush.Archivable = false

local function rayParams()
	local p = RaycastParams.new()
	p.FilterType = Enum.RaycastFilterType.Exclude
	local ignore = { brush, grassFolder() }
	local pack = findPack()
	if pack then
		table.insert(ignore, pack)
	end
	p.FilterDescendantsInstances = ignore
	p.IgnoreWater = true
	return p
end

local function mouseHit()
	local cam = workspace.CurrentCamera
	local pos = UserInputService:GetMouseLocation()
	local ray = cam:ViewportPointToRay(pos.X, pos.Y)
	return workspace:Raycast(ray.Origin, ray.Direction * 2000, rayParams())
end

----------------------------------------------------------------- painting --
-- spatial hash of existing tufts so spacing checks stay fast with thousands
local CELL = 4
local grid = {}
local function key(p)
	return math.floor(p.X / CELL) .. "," .. math.floor(p.Y / CELL) .. "," .. math.floor(p.Z / CELL)
end
local function addToGrid(part)
	local k = key(part.Position)
	grid[k] = grid[k] or {}
	table.insert(grid[k], part)
end
local function rebuildGrid()
	grid = {}
	for _, p in ipairs(grassFolder():GetChildren()) do
		if p:IsA("BasePart") then
			addToGrid(p)
		end
	end
end
local function tooClose(pos, dist)
	if dist <= 0 then
		return false
	end
	local r = math.ceil(dist / CELL)
	local cx, cy, cz = math.floor(pos.X / CELL), math.floor(pos.Y / CELL), math.floor(pos.Z / CELL)
	for x = cx - r, cx + r do
		for y = cy - r, cy + r do
			for z = cz - r, cz + r do
				local bucket = grid[x .. "," .. y .. "," .. z]
				if bucket then
					for _, p in ipairs(bucket) do
						if p.Parent and (p.Position - pos).Magnitude < dist then
							return true
						end
					end
				end
			end
		end
	end
	return false
end

local function basis(normal)
	local ref = math.abs(normal.Y) < 0.99 and Vector3.yAxis or Vector3.xAxis
	local t = normal:Cross(ref).Unit
	return t, normal:Cross(t).Unit
end

local rng = Random.new()

local function placeOne(list, hitPos, hitNormal, params)
	local t, b = basis(hitNormal)
	local a = rng:NextNumber(0, math.pi * 2)
	local r = cfg.radius * math.sqrt(rng:NextNumber())
	local offset = t * math.cos(a) * r + b * math.sin(a) * r
	local start = hitPos + offset + hitNormal * 5
	local res = workspace:Raycast(start, -hitNormal * 12, params)
	if not res then
		return
	end
	if res.Instance:IsA("BasePart") and res.Instance.Transparency >= 1 then
		return
	end

	local up = cfg.alignToSlope and res.Normal or Vector3.yAxis
	local src = list[rng:NextInteger(1, #list)]
	local s = rng:NextNumber(math.min(cfg.minScale, cfg.maxScale), math.max(cfg.minScale, cfg.maxScale))
	local size = src.Size * s

	-- meshes are exported with the roots at the bottom of the bounding box
	local centre = res.Position + up * (size.Y / 2 - cfg.sink * s)
	if tooClose(centre, cfg.spacing) then
		return
	end

	local ut, ub = basis(up)
	local yaw = rng:NextNumber(0, math.pi * 2)
	local right = ut * math.cos(yaw) + ub * math.sin(yaw)
	local g = src:Clone()
	g.Size = size
	g.CFrame = CFrame.fromMatrix(centre, right, up)
	g.Anchored = true
	g.CanCollide = false
	g.CanTouch = false
	g.CanQuery = false
	g.CastShadow = cfg.shadows
	g.Locked = false
	g.Parent = grassFolder()
	addToGrid(g)
end

local function paintAt(hit)
	local list = variants()
	if #list == 0 then
		rebuildVariantList()
		return
	end
	local params = rayParams()
	for _ = 1, cfg.count do
		placeOne(list, hit.Position, hit.Normal, params)
	end
end

local function eraseAt(hit)
	local r2 = cfg.radius * cfg.radius
	for _, p in ipairs(grassFolder():GetChildren()) do
		if p:IsA("BasePart") then
			local d = p.Position - hit.Position
			if d:Dot(d) <= r2 then
				p:Destroy()
			end
		end
	end
end

------------------------------------------------------------- tool control --
local active = false
local mouseDown = false
local recording = nil
local lastDab = nil
local conns = {}

local function updateBrush(hit)
	if not hit then
		brush.Parent = nil
		return
	end
	local erasing = UserInputService:IsKeyDown(Enum.KeyCode.LeftControl)
		or UserInputService:IsKeyDown(Enum.KeyCode.RightControl)
	brush.Color = erasing and Color3.fromRGB(255, 80, 80) or Color3.fromRGB(120, 255, 120)
	brush.Size = Vector3.new(0.2, cfg.radius * 2, cfg.radius * 2)
	-- cylinder axis is local X: point it along the surface normal
	brush.CFrame = CFrame.lookAt(hit.Position, hit.Position + hit.Normal) * CFrame.Angles(0, math.rad(90), 0)
	brush.Parent = workspace.CurrentCamera
end

local function stroke(hit)
	if not hit then
		return
	end
	if lastDab and (hit.Position - lastDab).Magnitude < math.max(cfg.radius * 0.5, 0.5) then
		return
	end
	lastDab = hit.Position
	if UserInputService:IsKeyDown(Enum.KeyCode.LeftControl) or UserInputService:IsKeyDown(Enum.KeyCode.RightControl) then
		eraseAt(hit)
	else
		paintAt(hit)
	end
end

local function endStroke()
	mouseDown = false
	lastDab = nil
	if recording then
		ChangeHistoryService:FinishRecording(recording, Enum.FinishRecordingOperation.Commit)
		recording = nil
	end
end

local function deactivate()
	if not active then
		return
	end
	active = false
	endStroke()
	for _, c in ipairs(conns) do
		c:Disconnect()
	end
	conns = {}
	brush.Parent = nil
	button:SetActive(false)
	widget.Enabled = false
	plugin:Deactivate()
end

local function activate()
	active = true
	button:SetActive(true)
	widget.Enabled = true
	plugin:Activate(true)
	rebuildVariantList()
	rebuildGrid()
	local mouse = plugin:GetMouse()
	table.insert(conns, mouse.Button1Down:Connect(function()
		mouseDown = true
		recording = ChangeHistoryService:TryBeginRecording("Paint grass")
		stroke(mouseHit())
	end))
	table.insert(conns, mouse.Button1Up:Connect(endStroke))
	table.insert(conns, mouse.Move:Connect(function()
		local hit = mouseHit()
		updateBrush(hit)
		if mouseDown then
			stroke(hit)
		end
	end))
	table.insert(conns, UserInputService.InputBegan:Connect(function(input, processed)
		if processed then
			return
		end
		if input.KeyCode == Enum.KeyCode.LeftBracket then
			cfg.radius = math.max(1, cfg.radius - 1)
		elseif input.KeyCode == Enum.KeyCode.RightBracket then
			cfg.radius = math.min(100, cfg.radius + 1)
		else
			return
		end
		radiusBox.Text = tostring(cfg.radius)
		saveCfg()
		updateBrush(mouseHit())
	end))
end

button.Click:Connect(function()
	if active then
		deactivate()
	else
		activate()
	end
end)
plugin.Deactivation:Connect(deactivate)
widget:GetPropertyChangedSignal("Enabled"):Connect(function()
	if not widget.Enabled then
		deactivate()
	end
end)
plugin.Unloading:Connect(function()
	deactivate()
	brush:Destroy()
end)
