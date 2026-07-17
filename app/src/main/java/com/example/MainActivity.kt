@file:OptIn(androidx.compose.material3.ExperimentalMaterial3Api::class)
package com.example

import android.os.Bundle
import android.util.Base64
import android.util.Log
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.compose.animation.*
import androidx.compose.animation.core.*
import androidx.compose.foundation.*
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.grid.*
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.lazy.itemsIndexed
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.ui.geometry.Offset
import androidx.compose.material.icons.filled.*
import androidx.compose.material.icons.outlined.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.*
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.AnnotatedString
import androidx.compose.ui.text.SpanStyle
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.BaselineShift
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.window.Dialog
import coil.compose.AsyncImage
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import org.json.JSONArray
import org.json.JSONObject
import java.io.InputStream
import java.security.MessageDigest
import java.util.zip.ZipInputStream
import javax.crypto.Cipher
import javax.crypto.SecretKey
import javax.crypto.SecretKeyFactory
import javax.crypto.spec.GCMParameterSpec
import javax.crypto.spec.PBEKeySpec
import javax.crypto.spec.SecretKeySpec

// ==========================================
// MODELS & SCHEMAS
// ==========================================

data class UserProfile(
    val id: String = "guest",
    val name: String = "Қонақ Оқушы",
    val avatar: String = "",
    val score: Int = 0,
    val completedTestsCount: Int = 12,
    val averageScore: Double = 84.5,
    val streakDays: Int = 5,
    val totalHistory: List<Int> = listOf(75, 82, 80, 88, 91, 84, 95, 101, 98, 105, 112, 104)
)

data class RankingEntry(
    val name: String,
    val avatar: String,
    val score: Int,
    val totalHistory: List<Int>,
    val type: String
)

data class TestTopic(
    val id: Int,
    val title: String,
    val subject: String,
    val file: String,
    val questionCount: Int = 0
)

data class QuizQuestion(
    val question: String,
    val options: List<String>,
    val correct: String? = null,
    val answer: String? = null,
    val imageUrl: String? = null
) {
    fun getCorrectAnswer(): String {
        if (!correct.isNullOrEmpty()) return correct
        if (!answer.isNullOrEmpty()) return answer
        return if (options.isNotEmpty()) options[0] else ""
    }
}

data class AnkiDeck(
    val id: String,
    val title: String,
    val file: String
)

data class AnkiCard(
    val id: String,
    val front: String,
    val back: String
)

data class BlockSubject(
    val id: String,
    val title: String,
    val topics: List<BlockTopic>
)

data class BlockTopic(
    val id: String,
    val code: String,
    val title: String,
    val summary: String,
    val file: String
)

// ==========================================
// CRYPTOGRAPHY HELPERS
// ==========================================

object AppCrypto {
    fun sha256Hex(text: String): String {
        val digest = MessageDigest.getInstance("SHA-256")
        val hashBytes = digest.digest(text.toByteArray(Charsets.UTF_8))
        return hashBytes.joinToString("") { "%02x".format(it) }
    }

    private fun deriveKey(secret: String, salt: ByteArray, iterations: Int): SecretKey {
        val factory = SecretKeyFactory.getInstance("PBKDF2WithHmacSHA256")
        val spec = PBEKeySpec(secret.toCharArray(), salt, iterations, 256)
        val tmp = factory.generateSecret(spec)
        return SecretKeySpec(tmp.encoded, "AES")
    }

    private fun decryptAesGcm(ciphertext: ByteArray, key: SecretKey, iv: ByteArray): String {
        val cipher = Cipher.getInstance("AES/GCM/NoPadding")
        val spec = GCMParameterSpec(128, iv)
        cipher.init(Cipher.DECRYPT_MODE, key, spec)
        val decryptedBytes = cipher.doFinal(ciphertext)
        return String(decryptedBytes, Charsets.UTF_8)
    }

    fun decryptUserPayload(secret: String, jsonString: String): UserProfile {
        val root = JSONObject(jsonString)
        val saltB64 = root.getString("salt_b64")
        val ivB64 = root.getString("iv_b64")
        val ciphertextB64 = root.getString("ciphertext_b64")
        val iterations = root.optInt("iterations", 250000)

        val salt = Base64.decode(saltB64, Base64.DEFAULT)
        val iv = Base64.decode(ivB64, Base64.DEFAULT)
        val ciphertext = Base64.decode(ciphertextB64, Base64.DEFAULT)

        val key = deriveKey(secret, salt, iterations)
        val plainText = decryptAesGcm(ciphertext, key, iv)
        
        val decryptedRoot = JSONObject(plainText)
        val name = decryptedRoot.optString("name", "Оқушы")
        val avatar = decryptedRoot.optString("avatar", "")
        val score = decryptedRoot.optInt("score", 0)
        
        val totalHistoryList = mutableListOf<Int>()
        val historyArr = decryptedRoot.optJSONArray("totalHistory")
        if (historyArr != null) {
            for (i in 0 until historyArr.length()) {
                totalHistoryList.add(historyArr.getInt(i))
            }
        } else {
            totalHistoryList.addAll(listOf(80, 85, 90, 88, 92, 95))
        }

        return UserProfile(
            id = sha256Hex(secret),
            name = name,
            avatar = avatar,
            score = score,
            completedTestsCount = decryptedRoot.optInt("completedTests", totalHistoryList.size),
            averageScore = decryptedRoot.optDouble("averageScore", totalHistoryList.average()),
            streakDays = decryptedRoot.optInt("streakDays", 3),
            totalHistory = totalHistoryList
        )
    }
}

// ==========================================
// UTILITY PARSERS
// ==========================================

fun loadAssetString(context: android.content.Context, path: String): String {
    return context.assets.open(path).use { input ->
        input.bufferedReader().use { it.readText() }
    }
}

fun parseHtmlToAnnotatedString(html: String): AnnotatedString {
    val cleanText = html
        .replace("&amp;", "&")
        .replace("&lt;", "<")
        .replace("&gt;", ">")
        .replace("&quot;", "\"")
        .replace("&#39;", "'")

    val builder = AnnotatedString.Builder()
    var i = 0
    while (i < cleanText.length) {
        if (cleanText.startsWith("<strong>", i)) {
            val end = cleanText.indexOf("</strong>", i)
            if (end != -1) {
                builder.pushStyle(SpanStyle(fontWeight = FontWeight.Bold))
                builder.append(cleanText.substring(i + 8, end))
                builder.pop()
                i = end + 9
            } else {
                builder.append("<strong>")
                i += 8
            }
        } else if (cleanText.startsWith("<sub>", i)) {
            val end = cleanText.indexOf("</sub>", i)
            if (end != -1) {
                builder.pushStyle(SpanStyle(baselineShift = BaselineShift.Subscript, fontSize = 11.sp))
                builder.append(cleanText.substring(i + 5, end))
                builder.pop()
                i = end + 6
            } else {
                builder.append("<sub>")
                i += 5
            }
        } else if (cleanText.startsWith("<sup>", i)) {
            val end = cleanText.indexOf("</sup>", i)
            if (end != -1) {
                builder.pushStyle(SpanStyle(baselineShift = BaselineShift.Superscript, fontSize = 11.sp))
                builder.append(cleanText.substring(i + 5, end))
                builder.pop()
                i = end + 6
            } else {
                builder.append("<sup>")
                i += 5
            }
        } else if (cleanText.startsWith("<code>", i)) {
            val end = cleanText.indexOf("</code>", i)
            if (end != -1) {
                builder.pushStyle(SpanStyle(fontFamily = FontFamily.Monospace, background = Color(0xFFF0F2F5)))
                builder.append(cleanText.substring(i + 6, end))
                builder.pop()
                i = end + 7
            } else {
                builder.append("<code>")
                i += 6
            }
        } else if (cleanText.startsWith("<p>", i)) {
            i += 3
        } else if (cleanText.startsWith("</p>", i)) {
            builder.append("\n")
            i += 4
        } else if (cleanText.startsWith("<br>", i)) {
            builder.append("\n")
            i += 4
        } else if (cleanText.startsWith("<br/>", i)) {
            builder.append("\n")
            i += 5
        } else {
            builder.append(cleanText[i])
            i++
        }
    }
    return builder.toAnnotatedString()
}

fun extractTextFromDocx(inputStream: InputStream): String {
    try {
        val zip = ZipInputStream(inputStream)
        var entry = zip.nextEntry
        while (entry != null) {
            if (entry.name == "word/document.xml") {
                val bytes = zip.readBytes()
                val xml = String(bytes, Charsets.UTF_8)
                
                val builder = StringBuilder()
                val paragraphs = xml.split("<w:p ")
                for (p in paragraphs) {
                    val textRegex = "<w:t.*?>(.*?)</w:t>".toRegex()
                    val pText = textRegex.findAll(p).map { it.groupValues[1] }.joinToString("")
                    if (pText.isNotEmpty()) {
                        builder.append(pText).append("\n\n")
                    }
                }
                return builder.toString()
                    .replace("&amp;", "&")
                    .replace("&lt;", "<")
                    .replace("&gt;", ">")
                    .trim()
            }
            entry = zip.nextEntry
        }
    } catch (e: Exception) {
        e.printStackTrace()
        return "Құжатты оқу барысында қате шықты: ${e.localizedMessage}"
    }
    return "Құжат мазмұны бос немесе табылған жоқ."
}

// ==========================================
// COLOR PALETTE (TEAL & COSMIC DARK)
// ==========================================

val CosmicTeal = Color(0xFF0F766E)
val LightTealBg = Color(0xFFE9F5F4)
val DarkBackground = Color(0xFF080710)
val DarkCard = Color(0x21FFFFFF)
val AccentBlue = Color(0xFF23A2F6)
val AccentOrange = Color(0xFFF09819)
val AccentRed = Color(0xFFFF512F)
val SoftGray = Color(0xFFF4F7FB)

// ==========================================
// MAIN ACTIVITY
// ==========================================

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        setContent {
            MaterialTheme(
                colorScheme = lightColorScheme(
                    primary = CosmicTeal,
                    background = Color.White,
                    surface = SoftGray
                )
            ) {
                MainApp()
            }
        }
    }
}

enum class TabItem {
    HOME, TESTS, ANKI, BLOCKS, FORMULAS, PROFILE
}

// ==========================================
// MAIN VIEWPORT
// ==========================================

@Composable
fun MainApp() {
    val context = LocalContext.current
    val coroutineScope = rememberCoroutineScope()
    
    // Auth State
    var currentUser by remember { mutableStateOf<UserProfile?>(null) }
    var pinError by remember { mutableStateOf(false) }
    var pinLoading by remember { mutableStateOf(false) }
    
    // Navigation
    var activeTab by remember { mutableStateOf(TabItem.HOME) }
    
    // Quiz Test States
    var activeTestTopic by remember { mutableStateOf<TestTopic?>(null) }
    var testModeSetting by remember { mutableStateOf("exam") } // instant, exam, self-check
    var testQuestionCountSetting by remember { mutableStateOf(60) }
    
    // Anki Deck States
    var activeAnkiDeck by remember { mutableStateOf<AnkiDeck?>(null) }
    
    // Study Block States
    var activeBlockTopic by remember { mutableStateOf<BlockTopic?>(null) }

    if (currentUser == null) {
        LoginScreen(
            error = pinError,
            loading = pinLoading,
            onLogin = { pin ->
                pinLoading = true
                pinError = false
                coroutineScope.launch(Dispatchers.IO) {
                    try {
                        val fileKey = AppCrypto.sha256Hex(pin)
                        val jsonString = loadAssetString(context, "users/$fileKey.json")
                        val profile = AppCrypto.decryptUserPayload(pin, jsonString)
                        withContext(Dispatchers.Main) {
                            currentUser = profile
                            pinLoading = false
                        }
                    } catch (e: Exception) {
                        Log.e("Auth", "Failed to login", e)
                        withContext(Dispatchers.Main) {
                            pinError = true
                            pinLoading = false
                        }
                    }
                }
            },
            onGuestLogin = {
                // Pre-seed a beautiful default profile to check features out
                currentUser = UserProfile(
                    id = "guest_demo",
                    name = "Бауыржан Саян",
                    avatar = "avatars/sayan.jpg",
                    score = 114,
                    completedTestsCount = 18,
                    averageScore = 92.0,
                    streakDays = 7,
                    totalHistory = listOf(82, 85, 91, 88, 95, 102, 98, 106, 114)
                )
            }
        )
    } else {
        Scaffold(
            bottomBar = {
                NavigationBar(
                    containerColor = Color.White,
                    tonalElevation = 8.dp
                ) {
                    val tabs = listOf(
                        Triple(TabItem.HOME, Icons.Default.Home, "Басты бет"),
                        Triple(TabItem.TESTS, Icons.Default.CheckCircle, "Тесттер"),
                        Triple(TabItem.ANKI, Icons.Default.Star, "Anki"),
                        Triple(TabItem.BLOCKS, Icons.Default.Book, "Блоктар"),
                        Triple(TabItem.PROFILE, Icons.Default.Person, "Профиль")
                    )
                    tabs.forEach { (tab, icon, label) ->
                        val isSelected = activeTab == tab
                        NavigationBarItem(
                            selected = isSelected,
                            onClick = { activeTab = tab },
                            icon = { Icon(icon, contentDescription = label) },
                            label = { Text(label, fontSize = 11.sp) },
                            colors = NavigationBarItemDefaults.colors(
                                selectedIconColor = CosmicTeal,
                                selectedTextColor = CosmicTeal,
                                indicatorColor = LightTealBg
                            )
                        )
                    }
                }
            }
        ) { paddingValues ->
            Box(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(paddingValues)
                    .background(SoftGray)
            ) {
                // If active test is selected, overlay test runner full screen
                activeTestTopic?.let { topic ->
                    TestRunnerView(
                        topic = topic,
                        mode = testModeSetting,
                        maxQuestions = testQuestionCountSetting,
                        onClose = { activeTestTopic = null }
                    )
                } ?: activeAnkiDeck?.let { deck ->
                    AnkiRunnerView(
                        deck = deck,
                        onClose = { activeAnkiDeck = null }
                    )
                } ?: activeBlockTopic?.let { block ->
                    BlockReaderView(
                        topic = block,
                        onClose = { activeBlockTopic = null }
                    )
                } ?: run {
                    when (activeTab) {
                        TabItem.HOME -> HomeScreen(
                            user = currentUser!!,
                            onStartInstantTest = {
                                activeTab = TabItem.TESTS
                            }
                        )
                        TabItem.TESTS -> TestsTab(
                            onSelectTopic = { activeTestTopic = it },
                            onOpenFormulas = { activeTab = TabItem.FORMULAS }
                        )
                        TabItem.ANKI -> AnkiTab(
                            onSelectDeck = { activeAnkiDeck = it }
                        )
                        TabItem.BLOCKS -> BlocksTab(
                            onSelectTopic = { activeBlockTopic = it }
                        )
                        TabItem.FORMULAS -> FormulasTab(
                            onBack = { activeTab = TabItem.TESTS }
                        )
                        TabItem.PROFILE -> ProfileTab(
                            user = currentUser!!,
                            testMode = testModeSetting,
                            onSetTestMode = { testModeSetting = it },
                            questionCount = testQuestionCountSetting,
                            onSetQuestionCount = { testQuestionCountSetting = it },
                            onLogout = { currentUser = null }
                        )
                    }
                }
            }
        }
    }
}

// ==========================================
// SCREEN: LOGIN
// ==========================================

@Composable
fun LoginScreen(
    error: Boolean,
    loading: Boolean,
    onLogin: (String) -> Unit,
    onGuestLogin: () -> Unit
) {
    var pinText by remember { mutableStateOf("") }
    
    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(DarkBackground)
    ) {
        // Decorative cosmic shapes drawing behind
        Canvas(modifier = Modifier.fillMaxSize()) {
            drawCircle(
                brush = Brush.radialGradient(
                    colors = listOf(Color(0xFF1845AD), Color.Transparent),
                    radius = size.minDimension * 0.4f
                ),
                center = Offset(0f, 0f)
            )
            drawCircle(
                brush = Brush.radialGradient(
                    colors = listOf(Color(0xFFFF512F), Color.Transparent),
                    radius = size.minDimension * 0.4f
                ),
                center = Offset(size.width, size.height)
            )
        }

        Box(
            modifier = Modifier
                .fillMaxSize()
                .padding(24.dp),
            contentAlignment = Alignment.Center
        ) {
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .clip(RoundedCornerShape(20.dp))
                    .background(Color(0x13FFFFFF))
                    .border(1.dp, Color(0x1AFFFFFF), RoundedCornerShape(20.dp))
                    .padding(horizontal = 24.dp, vertical = 36.dp),
                horizontalAlignment = Alignment.CenterHorizontally
            ) {
                Text(
                    text = "Қош келдіңіз!",
                    color = Color.White,
                    fontSize = 24.sp,
                    fontWeight = FontWeight.Bold
                )
                
                Spacer(modifier = Modifier.height(8.dp))
                
                Text(
                    text = "Кіру кодын енгізіңіз:",
                    color = Color.White.copy(alpha = 0.8f),
                    fontSize = 15.sp
                )

                Spacer(modifier = Modifier.height(28.dp))

                OutlinedTextField(
                    value = pinText,
                    onValueChange = { pinText = it },
                    placeholder = { Text("Кіру коды", color = Color.White.copy(alpha = 0.4f)) },
                    singleLine = true,
                    textStyle = TextStyle(
                        color = Color.White,
                        fontSize = 18.sp,
                        textAlign = TextAlign.Center,
                        fontWeight = FontWeight.Bold
                    ),
                    colors = OutlinedTextFieldDefaults.colors(
                        focusedBorderColor = AccentBlue,
                        unfocusedBorderColor = Color.White.copy(alpha = 0.2f),
                        cursorColor = Color.White
                    ),
                    modifier = Modifier.fillMaxWidth()
                )

                if (error) {
                    Spacer(modifier = Modifier.height(14.dp))
                    Text(
                        text = "Қате кіру коды. Қайтадан көріңіз.",
                        color = Color(0xFFFF4D4D),
                        fontSize = 13.sp,
                        fontWeight = FontWeight.Bold
                    )
                }

                Spacer(modifier = Modifier.height(24.dp))

                Button(
                    onClick = { if (pinText.isNotEmpty() && !loading) onLogin(pinText) },
                    colors = ButtonDefaults.buttonColors(containerColor = Color.White, contentColor = DarkBackground),
                    shape = RoundedCornerShape(10.dp),
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(50.dp)
                ) {
                    if (loading) {
                        CircularProgressIndicator(modifier = Modifier.size(20.dp), color = CosmicTeal)
                    } else {
                        Text("Кіру", fontWeight = FontWeight.Bold, fontSize = 16.sp)
                    }
                }

                Spacer(modifier = Modifier.height(14.dp))

                TextButton(
                    onClick = onGuestLogin
                ) {
                    Text(
                        text = "Қонақ ретінде кіру (Demo)",
                        color = Color.White.copy(alpha = 0.6f),
                        fontSize = 13.sp,
                        fontWeight = FontWeight.Medium
                    )
                }
            }
        }
    }
}

// ==========================================
// SCREEN: HOME
// ==========================================

@Composable
fun HomeScreen(
    user: UserProfile,
    onStartInstantTest: () -> Unit
) {
    LazyColumn(
        modifier = Modifier
            .fillMaxSize()
            .padding(horizontal = 16.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp)
    ) {
        item { Spacer(modifier = Modifier.height(16.dp)) }
        
        // Dynamic Greeting Hero Banner
        item {
            Card(
                colors = CardDefaults.cardColors(containerColor = CosmicTeal),
                shape = RoundedCornerShape(18.dp),
                modifier = Modifier.fillMaxWidth()
            ) {
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(20.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Column(modifier = Modifier.weight(1f)) {
                        Text(
                            text = "Сәлем, ${user.name}!",
                            color = Color.White,
                            fontSize = 22.sp,
                            fontWeight = FontWeight.Bold
                        )
                        Spacer(modifier = Modifier.height(6.dp))
                        Text(
                            text = "Кезекті тестілеуді бағындыруға дайынсың ба? ҰБТ-ға сәттілік!",
                            color = Color.White.copy(alpha = 0.85f),
                            fontSize = 13.sp
                        )
                    }
                    Spacer(modifier = Modifier.width(12.dp))
                    Box(
                        modifier = Modifier
                            .size(60.dp)
                            .clip(CircleShape)
                            .background(Color.White.copy(alpha = 0.2f)),
                        contentAlignment = Alignment.Center
                    ) {
                        Icon(
                            imageVector = Icons.Default.School,
                            contentDescription = "School",
                            tint = Color.White,
                            modifier = Modifier.size(32.dp)
                        )
                    }
                }
            }
        }

        // Student Stats Row
        item {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(12.dp)
            ) {
                StatCard(
                    modifier = Modifier.weight(1f),
                    title = "Жалпы ұпай",
                    value = "${user.score}",
                    icon = Icons.Default.Star,
                    color = AccentOrange
                )
                StatCard(
                    modifier = Modifier.weight(1f),
                    title = "Орындалған",
                    value = "${user.completedTestsCount}",
                    icon = Icons.Default.AssignmentTurnedIn,
                    color = CosmicTeal
                )
                StatCard(
                    modifier = Modifier.weight(1f),
                    title = "Күндік ағын",
                    value = "${user.streakDays} күн",
                    icon = Icons.Default.LocalFireDepartment,
                    color = AccentRed
                )
            }
        }

        // Custom Visual Chart Card (Scores over Time)
        item {
            ElevatedCard(
                colors = CardDefaults.elevatedCardColors(containerColor = Color.White),
                shape = RoundedCornerShape(16.dp),
                modifier = Modifier.fillMaxWidth()
            ) {
                Column(modifier = Modifier.padding(18.dp)) {
                    Text(
                        text = "ҰБТ нәтижелерінің динамикасы",
                        fontWeight = FontWeight.Bold,
                        color = CosmicTeal,
                        fontSize = 16.sp
                    )
                    Spacer(modifier = Modifier.height(16.dp))
                    
                    Box(
                        modifier = Modifier
                            .fillMaxWidth()
                            .height(150.dp)
                    ) {
                        ScoresChart(history = user.totalHistory)
                    }
                    
                    Spacer(modifier = Modifier.height(10.dp))
                    Text(
                        text = "Соңғы орындалған ${user.totalHistory.size} тестіңіздің өсу бағыты.",
                        color = Color.Gray,
                        fontSize = 11.sp,
                        textAlign = TextAlign.Center,
                        modifier = Modifier.fillMaxWidth()
                    )
                }
            }
        }

        // Daily Progress Calendar Matrix
        item {
            ElevatedCard(
                colors = CardDefaults.elevatedCardColors(containerColor = Color.White),
                shape = RoundedCornerShape(16.dp),
                modifier = Modifier.fillMaxWidth()
            ) {
                Column(modifier = Modifier.padding(18.dp)) {
                    Text(
                        text = "Белсенділік күнтізбесі",
                        fontWeight = FontWeight.Bold,
                        color = CosmicTeal,
                        fontSize = 16.sp
                    )
                    Spacer(modifier = Modifier.height(12.dp))
                    
                    // GitHub Contribution style block matrix for last 14 days
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween
                    ) {
                        for (i in 1..14) {
                            val active = i % 3 != 0
                            Box(
                                modifier = Modifier
                                    .size(18.dp)
                                    .clip(RoundedCornerShape(3.dp))
                                    .background(if (active) CosmicTeal.copy(alpha = 0.15f + (i % 3) * 0.3f) else Color(0xFFE2E8F0))
                            )
                        }
                    }
                    
                    Spacer(modifier = Modifier.height(12.dp))
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Text("Төмен белсенділік", fontSize = 11.sp, color = Color.Gray)
                        Text("Жоғары белсенділік", fontSize = 11.sp, color = Color.Gray)
                    }
                }
            }
        }

        item { Spacer(modifier = Modifier.height(16.dp)) }
    }
}

@Composable
fun StatCard(
    modifier: Modifier = Modifier,
    title: String,
    value: String,
    icon: ImageVector,
    color: Color
) {
    Card(
        colors = CardDefaults.cardColors(containerColor = Color.White),
        shape = RoundedCornerShape(14.dp),
        modifier = modifier.border(1.dp, Color(0xFFE2E8F0), RoundedCornerShape(14.dp))
    ) {
        Column(
            modifier = Modifier.padding(12.dp)
        ) {
            Icon(
                imageVector = icon,
                contentDescription = null,
                tint = color,
                modifier = Modifier.size(24.dp)
            )
            Spacer(modifier = Modifier.height(12.dp))
            Text(
                text = value,
                fontSize = 18.sp,
                fontWeight = FontWeight.Bold,
                color = CosmicTeal
            )
            Spacer(modifier = Modifier.height(2.dp))
            Text(
                text = title,
                fontSize = 11.sp,
                color = Color.Gray,
                maxLines = 1,
                overflow = TextOverflow.Ellipsis
            )
        }
    }
}

@Composable
fun ScoresChart(history: List<Int>) {
    Canvas(modifier = Modifier.fillMaxSize()) {
        if (history.isEmpty()) return@Canvas
        
        val maxScore = history.maxOrNull()?.toFloat() ?: 140f
        val minScore = 0f
        val scoreRange = maxScore - minScore
        
        val width = size.width
        val height = size.height
        val stepX = width / (history.size - 1).coerceAtLeast(1)
        
        // Draw grid lines
        for (i in 1..4) {
            val gridY = height * (i / 5f)
            drawLine(
                color = Color.LightGray.copy(alpha = 0.3f),
                start = Offset(0f, gridY),
                end = Offset(width, gridY),
                strokeWidth = 1.dp.toPx()
            )
        }

        val points = history.mapIndexed { index, score ->
            val fraction = (score - minScore) / scoreRange.coerceAtLeast(1f)
            val pointY = height - (fraction * height * 0.8f) - (height * 0.1f)
            Offset(index * stepX, pointY)
        }
        
        // Draw gradient area below the line
        val path = Path().apply {
            moveTo(0f, height)
            points.forEachIndexed { idx, pt ->
                if (idx == 0) lineTo(pt.x, pt.y)
                else lineTo(pt.x, pt.y)
            }
            lineTo(width, height)
            close()
        }
        
        drawPath(
            path = path,
            brush = Brush.verticalGradient(
                colors = listOf(CosmicTeal.copy(alpha = 0.3f), Color.Transparent),
                startY = points.map { it.y }.minOrNull() ?: 0f,
                endY = height
            )
        )
        
        // Draw connection line
        points.forEachIndexed { idx, pt ->
            if (idx > 0) {
                drawLine(
                    color = CosmicTeal,
                    start = points[idx - 1],
                    end = pt,
                    strokeWidth = 3.dp.toPx(),
                    cap = StrokeCap.Round
                )
            }
        }
        
        // Draw point dots
        points.forEach { pt ->
            drawCircle(
                color = Color.White,
                radius = 5.dp.toPx(),
                center = pt
            )
            drawCircle(
                color = CosmicTeal,
                radius = 3.dp.toPx(),
                center = pt
            )
        }
    }
}

// ==========================================
// SCREEN: TESTS TAB
// ==========================================

@Composable
fun TestsTab(
    onSelectTopic: (TestTopic) -> Unit,
    onOpenFormulas: () -> Unit
) {
    val context = LocalContext.current
    var topicsList by remember { mutableStateOf<List<TestTopic>>(emptyList()) }
    var selectedSubjectTab by remember { mutableStateOf("Информатика") } // Информатика vs Қазақстан тарихы
    var searchQuery by remember { mutableStateOf("") }

    // Load test catalog from assets
    LaunchedEffect(Unit) {
        withContext(Dispatchers.IO) {
            try {
                val catalogStr = loadAssetString(context, "test/data/catalog.json")
                val arr = JSONArray(catalogStr)
                val loaded = mutableListOf<TestTopic>()
                
                // Static metadata definitions from JS file:
                val staticMetas = listOf(
                    TestTopic(1, "Ерте орта Қазақстан VI-IX", "Қазақстан тарихы", "test/data/turik.json", 60),
                    TestTopic(2, "Ерте орта ғасыр мәдениеті VI-IX", "Қазақстан тарихы", "test/data/turikmadinet.json", 55),
                    TestTopic(3, "IX-XI ғасырлардағы Қазақстан", "Қазақстан тарихы", "test/data/qarakhan.json", 65),
                    TestTopic(5, "Біртұтас қазақ хандығының құрылуы", "Қазақстан тарихы", "test/data/khanat-v2.json", 120),
                    TestTopic(6, "Жаңа замандағы Қазақстан", "Қазақстан тарихы", "test/data/zhongar.json", 80),
                    TestTopic(8, "Сырым Датұлы", "Қазақстан тарихы", "test/data/syrymdatuly.json", 40),
                    TestTopic(9, "XV-XIX ғасырлардағы мәдениеті", "Қазақстан тарихы", "test/data/xvmadinet.json", 50),
                    TestTopic(10, "Ноғай", "Қазақстан тарихы", "test/data/nogai.json", 30),
                    TestTopic(11, "Алтын орда", "Қазақстан тарихы", "test/data/altynorda.json", 75),
                    TestTopic(12, "Шыңғыс хан", "Қазақстан тарихы", "test/data/mongolshapkyn.json", 45),
                    TestTopic(13, "Ежелгі Қазақстан", "Қазақстан тарихы", "test/data/ezhelgi.json", 90),
                    TestTopic(14, "Қазақстандағы хандық биліктің жойылуы", "Қазақстан тарихы", "test/data/khanatedel.json", 60),
                    TestTopic(15, "Есет пен Жаңқожа", "Қазақстан тарихы", "test/data/kz-history-10-test-1.json", 50),
                    TestTopic(16, "1867-1868 Жылдардағы реформа", "Қазақстан тарихы", "test/data/eset.json", 40),
                    TestTopic(23, "1920-1930 жылдардағы Қазақстан", "Қазақстан тарихы", "test/data/1920-30.json", 80),
                    TestTopic(24, "Ұлы Отан соғысы", "Қазақстан тарихы", "test/data/ulyOtan.json", 110),
                    TestTopic(25, "Тоқырау жылдарындағы Қазақстан", "Қазақстан тарихы", "test/data/tokyrau.json", 60),
                    TestTopic(26, "1930 жылдардағы қоғамдық-саяси", "Қазақстан тарихы", "test/data/1930.json", 55),
                    TestTopic(32, "1916-1920 жылдардағы Қазақстан", "Қазақстан тарихы", "test/data/1916.json", 70),
                    TestTopic(150, "1.1 Компьютер конфигурациясы", "Информатика", "test/data/1.1.json", 30),
                    TestTopic(151, "1.2 Компьютер жады", "Информатика", "test/data/1.2.json", 25),
                    TestTopic(152, "1.3 Бағдармалалық жасақтама", "Информатика", "test/data/1.3.json", 35),
                    TestTopic(153, "1.4 Басқару құрылғысы АЛҚ ЖАД", "Информатика", "test/data/1.4.json", 40),
                    TestTopic(154, "2.1 Ақпарат сипаты және қасиеті", "Информатика", "test/data/2.1.json", 30),
                    TestTopic(155, "2.2 Ақпаратты кодтау және декодтау", "Информатика", "test/data/2.2.json", 45),
                    TestTopic(156, "2.5 Екілік, ондық, сегіздік, он алтылық", "Информатика", "test/data/2.5.json", 50),
                    TestTopic(158, "4.1 Компьютерлік желілері", "Информатика", "test/data/4.1.json", 35),
                    TestTopic(159, "4.3 IP адрес", "Информатика", "test/data/4.3.json", 30),
                    TestTopic(160, "10.1.1 HTML", "Информатика", "test/data/10.1.1.json", 151),
                    TestTopic(162, "Python тесті", "Информатика", "test/data/python.json", 100),
                    TestTopic(163, "CSS тесті", "Информатика", "test/data/css.json", 80),
                    TestTopic(165, "Excel тесті", "Информатика", "test/data/excel.json", 65)
                )

                loaded.addAll(staticMetas)
                
                // Add any dynamic items from catalog.json
                for (i in 0 until arr.length()) {
                    val obj = arr.getJSONObject(i)
                    val id = obj.getInt("id")
                    if (loaded.none { it.id == id }) {
                        loaded.add(
                            TestTopic(
                                id = id,
                                title = obj.getString("title"),
                                subject = obj.optString("subject", "Информатика"),
                                file = obj.getString("file"),
                                questionCount = obj.optInt("questionCount", 60)
                            )
                        )
                    }
                }
                
                withContext(Dispatchers.Main) {
                    topicsList = loaded
                }
            } catch (e: Exception) {
                Log.e("Tests", "Failed to load catalog", e)
            }
        }
    }

    val filteredTopics = topicsList.filter {
        it.subject == selectedSubjectTab &&
        (searchQuery.isEmpty() || it.title.contains(searchQuery, ignoreCase = true))
    }

    Column(modifier = Modifier.fillMaxSize()) {
        // Upper section containing Header & Tabs
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .background(Color.White)
                .padding(top = 16.dp, bottom = 8.dp)
        ) {
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 16.dp),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(
                    text = "ҰБТ Тесттері",
                    fontSize = 22.sp,
                    fontWeight = FontWeight.Bold,
                    color = CosmicTeal
                )
                
                IconButton(onClick = onOpenFormulas) {
                    Icon(
                        imageVector = Icons.Default.Functions,
                        contentDescription = "Математикалық формулалар",
                        tint = CosmicTeal
                    )
                }
            }
            
            Spacer(modifier = Modifier.height(12.dp))

            // Search Bar
            OutlinedTextField(
                value = searchQuery,
                onValueChange = { searchQuery = it },
                placeholder = { Text("Тақырып бойынша іздеу...", color = Color.Gray) },
                leadingIcon = { Icon(Icons.Default.Search, contentDescription = "Search", tint = Color.Gray) },
                singleLine = true,
                shape = RoundedCornerShape(12.dp),
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 16.dp)
                    .height(52.dp)
            )

            Spacer(modifier = Modifier.height(14.dp))

            // Subject Tab selection
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 16.dp)
            ) {
                listOf("Информатика", "Қазақстан тарихы").forEach { subject ->
                    val isSelected = selectedSubjectTab == subject
                    Box(
                        modifier = Modifier
                            .weight(1f)
                            .clip(RoundedCornerShape(8.dp))
                            .background(if (isSelected) CosmicTeal else Color.Transparent)
                            .clickable { selectedSubjectTab = subject }
                            .padding(vertical = 10.dp),
                        contentAlignment = Alignment.Center
                    ) {
                        Text(
                            text = subject,
                            color = if (isSelected) Color.White else CosmicTeal,
                            fontWeight = FontWeight.Bold,
                            fontSize = 14.sp
                        )
                    }
                }
            }
        }

        // Scrollable Lists of Test Topics
        LazyColumn(
            modifier = Modifier
                .fillMaxSize()
                .padding(horizontal = 16.dp),
            verticalArrangement = Arrangement.spacedBy(10.dp)
        ) {
            item { Spacer(modifier = Modifier.height(10.dp)) }

            if (filteredTopics.isEmpty()) {
                item {
                    Box(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(vertical = 48.dp),
                        contentAlignment = Alignment.Center
                    ) {
                        Text("Тақырыптар табылмады.", color = Color.Gray, fontSize = 14.sp)
                    }
                }
            } else {
                items(filteredTopics) { topic ->
                    ElevatedCard(
                        colors = CardDefaults.elevatedCardColors(containerColor = Color.White),
                        shape = RoundedCornerShape(12.dp),
                        modifier = Modifier
                            .fillMaxWidth()
                            .clickable { onSelectTopic(topic) }
                    ) {
                        Row(
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(16.dp),
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Box(
                                modifier = Modifier
                                    .size(46.dp)
                                    .clip(RoundedCornerShape(8.dp))
                                    .background(LightTealBg),
                                contentAlignment = Alignment.Center
                            ) {
                                Icon(
                                    imageVector = if (topic.subject == "Информатика") Icons.Default.Computer else Icons.Default.HistoryEdu,
                                    contentDescription = null,
                                    tint = CosmicTeal,
                                    modifier = Modifier.size(24.dp)
                                )
                            }
                            Spacer(modifier = Modifier.width(14.dp))
                            Column(modifier = Modifier.weight(1f)) {
                                Text(
                                    text = topic.title,
                                    fontWeight = FontWeight.Bold,
                                    color = Color.Black,
                                    fontSize = 14.sp,
                                    maxLines = 2,
                                    overflow = TextOverflow.Ellipsis
                                )
                                Spacer(modifier = Modifier.height(4.dp))
                                Row(verticalAlignment = Alignment.CenterVertically) {
                                    Text(
                                        text = topic.subject,
                                        fontSize = 11.sp,
                                        color = CosmicTeal,
                                        fontWeight = FontWeight.Bold
                                    )
                                    Spacer(modifier = Modifier.width(8.dp))
                                    Text(
                                        text = "• ${topic.questionCount} сұрақ",
                                        fontSize = 11.sp,
                                        color = Color.Gray
                                    )
                                }
                            }
                            Spacer(modifier = Modifier.width(8.dp))
                            Icon(
                                imageVector = Icons.Default.ArrowForwardIos,
                                contentDescription = "Go",
                                tint = Color.LightGray,
                                modifier = Modifier.size(14.dp)
                            )
                        }
                    }
                }
            }

            item { Spacer(modifier = Modifier.height(16.dp)) }
        }
    }
}

// ==========================================
// SCREEN: TEST RUNNER VIEW
// ==========================================

@Composable
fun TestRunnerView(
    topic: TestTopic,
    mode: String, // instant, exam, self-check
    maxQuestions: Int,
    onClose: () -> Unit
) {
    val context = LocalContext.current
    val scope = rememberCoroutineScope()
    
    var questionsList by remember { mutableStateOf<List<QuizQuestion>>(emptyList()) }
    var loadedByResource by remember { mutableStateOf(false) }
    var loading by remember { mutableStateOf(true) }
    
    // Test Process Variables
    var currentIdx by remember { mutableStateOf(0) }
    val userAnswers = remember { mutableStateMapOf<Int, Int>() } // questionIndex -> selectedOptionIndex
    val selfCheckMarks = remember { mutableStateMapOf<Int, Boolean>() } // questionIndex -> correct/incorrect
    var showSelfCheckAnswer by remember { mutableStateOf(false) }
    
    // Timer
    var elapsedSeconds by remember { mutableStateOf(0) }
    var finished by remember { mutableStateOf(false) }

    // Load quiz question JSON file
    LaunchedEffect(topic) {
        withContext(Dispatchers.IO) {
            try {
                val jsonStr = loadAssetString(context, topic.file)
                val arr = JSONArray(jsonStr)
                val list = mutableListOf<QuizQuestion>()
                for (i in 0 until arr.length()) {
                    val obj = arr.getJSONObject(i)
                    val qText = obj.getString("question")
                    val optArr = obj.getJSONArray("options")
                    val opts = mutableListOf<String>()
                    for (j in 0 until optArr.length()) {
                        opts.add(optArr.getString(j))
                    }
                    val correct = obj.optString("correct", null)
                    val answer = obj.optString("answer", null)
                    val img = obj.optString("imageUrl", null)
                    list.add(QuizQuestion(qText, opts, correct, answer, img))
                }
                
                // Shuffle and truncate questions based on user's preference
                val shuffled = list.shuffled().take(maxQuestions)
                
                withContext(Dispatchers.Main) {
                    questionsList = shuffled
                    loading = false
                }
            } catch (e: Exception) {
                Log.e("QuizRunner", "Failed to load quiz", e)
                withContext(Dispatchers.Main) {
                    loading = false
                }
            }
        }
    }

    // Timer trigger
    LaunchedEffect(finished, loading) {
        if (!loading && !finished) {
            while (true) {
                delay(1000)
                elapsedSeconds++
            }
        }
    }

    fun getTimerString(sec: Int): String {
        val h = sec / 3600
        val m = (sec % 3600) / 60
        val s = sec % 60
        return "%02d:%02d:%02d".format(h, m, s)
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = {
                    Text(
                        text = topic.title,
                        fontSize = 16.sp,
                        fontWeight = FontWeight.Bold,
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis
                    )
                },
                navigationIcon = {
                    IconButton(onClick = onClose) {
                        Icon(Icons.Default.Close, contentDescription = "Close")
                    }
                },
                actions = {
                    Text(
                        text = getTimerString(elapsedSeconds),
                        fontWeight = FontWeight.Bold,
                        color = CosmicTeal,
                        fontSize = 14.sp,
                        modifier = Modifier.padding(end = 16.dp)
                    )
                },
                colors = TopAppBarDefaults.topAppBarColors(containerColor = Color.White)
            )
        }
    ) { padding ->
        Box(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
                .background(SoftGray)
        ) {
            if (loading) {
                Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                    CircularProgressIndicator(color = CosmicTeal)
                }
            } else if (questionsList.isEmpty()) {
                Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                    Text("Тест мазмұны табылмады.", color = Color.Gray)
                }
            } else if (!finished) {
                val currentQuestion = questionsList[currentIdx]
                val correctText = currentQuestion.getCorrectAnswer()
                val selectedOptionIdx = userAnswers[currentIdx]

                Column(
                    modifier = Modifier
                        .fillMaxSize()
                        .padding(16.dp)
                        .verticalScroll(rememberScrollState())
                ) {
                    // Question Count Progress
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Text(
                            text = "Сұрақ ${currentIdx + 1} / ${questionsList.size}",
                            fontWeight = FontWeight.Bold,
                            color = CosmicTeal,
                            fontSize = 14.sp
                        )
                        Text(
                            text = "${((currentIdx + 1).toFloat() / questionsList.size * 100).toInt()}%",
                            color = Color.Gray,
                            fontSize = 12.sp
                        )
                    }
                    
                    Spacer(modifier = Modifier.height(8.dp))
                    
                    LinearProgressIndicator(
                        progress = { (currentIdx + 1).toFloat() / questionsList.size },
                        color = CosmicTeal,
                        trackColor = Color(0xFFE2E8F0),
                        modifier = Modifier
                            .fillMaxWidth()
                            .height(6.dp)
                            .clip(RoundedCornerShape(3.dp))
                    )

                    Spacer(modifier = Modifier.height(24.dp))

                    // Question Card View
                    ElevatedCard(
                        colors = CardDefaults.elevatedCardColors(containerColor = Color.White),
                        shape = RoundedCornerShape(16.dp),
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        Column(modifier = Modifier.padding(18.dp)) {
                            // Question content with html parsing
                            Text(
                                text = parseHtmlToAnnotatedString(currentQuestion.question),
                                fontSize = 16.sp,
                                fontWeight = FontWeight.Bold,
                                color = Color.Black,
                                lineHeight = 22.sp
                            )
                            
                            // Load question Image if exists
                            currentQuestion.imageUrl?.let { img ->
                                Spacer(modifier = Modifier.height(14.dp))
                                // Check if the path begins with assets standard or local relative paths
                                val cleanImgPath = img.replace("test/assets/", "").replace("123/", "123/")
                                AsyncImage(
                                    model = "file:///android_asset/$cleanImgPath",
                                    contentDescription = "Question Image",
                                    modifier = Modifier
                                        .fillMaxWidth()
                                        .height(180.dp)
                                        .clip(RoundedCornerShape(8.dp))
                                        .border(1.dp, Color.LightGray, RoundedCornerShape(8.dp))
                                )
                            }
                        }
                    }

                    Spacer(modifier = Modifier.height(18.dp))

                    // Options Container
                    if (mode == "self-check") {
                        if (showSelfCheckAnswer) {
                            ElevatedCard(
                                colors = CardDefaults.elevatedCardColors(containerColor = LightTealBg),
                                shape = RoundedCornerShape(14.dp),
                                modifier = Modifier.fillMaxWidth()
                            ) {
                                Column(modifier = Modifier.padding(16.dp)) {
                                    Text("Дұрыс жауабы:", fontWeight = FontWeight.Bold, color = CosmicTeal, fontSize = 13.sp)
                                    Spacer(modifier = Modifier.height(4.dp))
                                    Text(
                                        text = parseHtmlToAnnotatedString(correctText),
                                        fontWeight = FontWeight.Bold,
                                        fontSize = 16.sp,
                                        color = CosmicTeal
                                    )
                                }
                            }
                            Spacer(modifier = Modifier.height(24.dp))
                            
                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.spacedBy(12.dp)
                            ) {
                                Button(
                                    onClick = {
                                        selfCheckMarks[currentIdx] = false
                                        showSelfCheckAnswer = false
                                        if (currentIdx < questionsList.size - 1) currentIdx++ else finished = true
                                    },
                                    colors = ButtonDefaults.buttonColors(containerColor = AccentRed),
                                    modifier = Modifier.weight(1f)
                                ) {
                                    Text("Қате жауап бердім", color = Color.White)
                                }
                                Button(
                                    onClick = {
                                        selfCheckMarks[currentIdx] = true
                                        showSelfCheckAnswer = false
                                        if (currentIdx < questionsList.size - 1) currentIdx++ else finished = true
                                    },
                                    colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF36A269)),
                                    modifier = Modifier.weight(1f)
                                ) {
                                    Text("Дұрыс жауап бердім", color = Color.White)
                                }
                            }
                        } else {
                            Button(
                                onClick = { showSelfCheckAnswer = true },
                                colors = ButtonDefaults.buttonColors(containerColor = CosmicTeal),
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .height(50.dp)
                            ) {
                                Text("Жауапты көрсету", fontWeight = FontWeight.Bold)
                            }
                        }
                    } else {
                        // Shuffled options list
                        Column(
                            verticalArrangement = Arrangement.spacedBy(10.dp)
                        ) {
                            currentQuestion.options.forEachIndexed { optIdx, optVal ->
                                val isSelected = selectedOptionIdx == optIdx
                                val isOptionCorrect = optVal == correctText
                                
                                val cardBg = when {
                                    mode == "instant" && isSelected && isOptionCorrect -> Color(0xFFE9F8EF)
                                    mode == "instant" && isSelected && !isOptionCorrect -> Color(0xFFFDE8E8)
                                    mode == "instant" && selectedOptionIdx != null && isOptionCorrect -> Color(0xFFE9F8EF)
                                    isSelected -> LightTealBg
                                    else -> Color.White
                                }

                                val borderClr = when {
                                    mode == "instant" && isSelected && isOptionCorrect -> Color(0xFF36A269)
                                    mode == "instant" && isSelected && !isOptionCorrect -> Color(0xFFFF4D4D)
                                    mode == "instant" && selectedOptionIdx != null && isOptionCorrect -> Color(0xFF36A269)
                                    isSelected -> CosmicTeal
                                    else -> Color(0xFFD8E0EC)
                                }

                                Row(
                                    modifier = Modifier
                                        .fillMaxWidth()
                                        .clip(RoundedCornerShape(12.dp))
                                        .background(cardBg)
                                        .border(1.dp, borderClr, RoundedCornerShape(12.dp))
                                        .clickable {
                                            if (mode == "exam" || selectedOptionIdx == null) {
                                                userAnswers[currentIdx] = optIdx
                                                if (mode == "instant") {
                                                    scope.launch {
                                                        delay(1200)
                                                        if (currentIdx < questionsList.size - 1) {
                                                            currentIdx++
                                                        } else {
                                                            finished = true
                                                        }
                                                    }
                                                }
                                            }
                                        }
                                        .padding(14.dp),
                                    verticalAlignment = Alignment.CenterVertically
                                ) {
                                    Box(
                                        modifier = Modifier
                                            .size(24.dp)
                                            .clip(CircleShape)
                                            .background(if (isSelected) CosmicTeal else Color(0xFFF1F5F9))
                                            .border(1.dp, if (isSelected) CosmicTeal else Color(0xFFCBD5E1), CircleShape),
                                        contentAlignment = Alignment.Center
                                    ) {
                                        val labelText = ('A' + optIdx).toString()
                                        Text(
                                            text = labelText,
                                            fontSize = 11.sp,
                                            color = if (isSelected) Color.White else Color.Gray,
                                            fontWeight = FontWeight.Bold
                                        )
                                    }
                                    Spacer(modifier = Modifier.width(12.dp))
                                    Text(
                                        text = parseHtmlToAnnotatedString(optVal),
                                        fontSize = 14.sp,
                                        color = Color.Black,
                                        modifier = Modifier.weight(1f)
                                    )
                                    
                                    // Checkmark feedback for instant mode
                                    if (mode == "instant" && selectedOptionIdx != null) {
                                        if (isOptionCorrect) {
                                            Icon(Icons.Default.Check, contentDescription = "Correct", tint = Color(0xFF36A269))
                                        } else if (isSelected) {
                                            Icon(Icons.Default.Close, contentDescription = "Incorrect", tint = Color(0xFFFF4D4D))
                                        }
                                    }
                                }
                            }
                        }
                    }

                    Spacer(modifier = Modifier.height(28.dp))

                    // Previous/Next Controllers
                    if (mode == "exam") {
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Button(
                                onClick = { if (currentIdx > 0) currentIdx-- },
                                enabled = currentIdx > 0,
                                colors = ButtonDefaults.buttonColors(containerColor = Color.White, contentColor = CosmicTeal),
                                shape = RoundedCornerShape(8.dp),
                                modifier = Modifier
                                    .weight(1f)
                                    .border(1.dp, CosmicTeal, RoundedCornerShape(8.dp))
                            ) {
                                Text("Артқа")
                            }
                            
                            Spacer(modifier = Modifier.width(16.dp))

                            if (currentIdx == questionsList.size - 1) {
                                Button(
                                    onClick = { finished = true },
                                    colors = ButtonDefaults.buttonColors(containerColor = CosmicTeal),
                                    shape = RoundedCornerShape(8.dp),
                                    modifier = Modifier.weight(1f)
                                ) {
                                    Text("Аяқтау")
                                }
                            } else {
                                Button(
                                    onClick = { currentIdx++ },
                                    colors = ButtonDefaults.buttonColors(containerColor = CosmicTeal),
                                    shape = RoundedCornerShape(8.dp),
                                    modifier = Modifier.weight(1f)
                                ) {
                                    Text("Келесі")
                                }
                            }
                        }
                    }
                }
            } else {
                // TEST FINISHED / REPORT SCREEN
                var correctCount = 0
                if (mode == "self-check") {
                    correctCount = selfCheckMarks.values.count { it }
                } else {
                    questionsList.forEachIndexed { index, q ->
                        val selectedOptIdx = userAnswers[index]
                        if (selectedOptIdx != null && q.options[selectedOptIdx] == q.getCorrectAnswer()) {
                            correctCount++
                        }
                    }
                }
                
                val percentage = (correctCount.toFloat() / questionsList.size * 100).toInt()

                Column(
                    modifier = Modifier
                        .fillMaxSize()
                        .padding(16.dp)
                        .verticalScroll(rememberScrollState()),
                    horizontalAlignment = Alignment.CenterHorizontally
                ) {
                    Spacer(modifier = Modifier.height(24.dp))
                    Icon(
                        imageVector = Icons.Default.EmojiEvents,
                        contentDescription = "Success Trophy",
                        tint = AccentOrange,
                        modifier = Modifier.size(80.dp)
                    )
                    Spacer(modifier = Modifier.height(16.dp))
                    Text(
                        text = "Тестілеу аяқталды!",
                        fontSize = 22.sp,
                        fontWeight = FontWeight.Bold,
                        color = Color.Black
                    )
                    
                    Spacer(modifier = Modifier.height(24.dp))

                    ElevatedCard(
                        colors = CardDefaults.elevatedCardColors(containerColor = Color.White),
                        shape = RoundedCornerShape(16.dp),
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        Column(
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(20.dp),
                            horizontalAlignment = Alignment.CenterHorizontally
                        ) {
                            Text(
                                text = "$correctCount / ${questionsList.size}",
                                fontSize = 36.sp,
                                fontWeight = FontWeight.ExtraBold,
                                color = CosmicTeal
                            )
                            Spacer(modifier = Modifier.height(4.dp))
                            Text(
                                text = "Дұрыс жауап саны ($percentage%)",
                                color = Color.Gray,
                                fontSize = 13.sp
                            )
                            Spacer(modifier = Modifier.height(18.dp))
                            HorizontalDivider()
                            Spacer(modifier = Modifier.height(14.dp))
                            
                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.SpaceAround
                            ) {
                                Column(horizontalAlignment = Alignment.CenterHorizontally) {
                                    Text("Уақыт", color = Color.Gray, fontSize = 11.sp)
                                    Text(getTimerString(elapsedSeconds), fontWeight = FontWeight.Bold, fontSize = 14.sp)
                                }
                                Column(horizontalAlignment = Alignment.CenterHorizontally) {
                                    Text("Режим", color = Color.Gray, fontSize = 11.sp)
                                    val modeName = when(mode) {
                                        "instant" -> "Қазіргі"
                                        "exam" -> "Еркін"
                                        else -> "Өзін-өзі тексеру"
                                    }
                                    Text(modeName, fontWeight = FontWeight.Bold, fontSize = 14.sp)
                                }
                            }
                        }
                    }

                    Spacer(modifier = Modifier.height(24.dp))

                    // List of mistakes (except self-check)
                    val mistakesList = if (mode == "self-check") emptyList() else questionsList.filterIndexed { index, q ->
                        val selectedOptIdx = userAnswers[index]
                        selectedOptIdx == null || q.options[selectedOptIdx] != q.getCorrectAnswer()
                    }

                    if (mistakesList.isNotEmpty()) {
                        Text(
                            text = "Қателермен жұмыс (${mistakesList.size})",
                            fontSize = 16.sp,
                            fontWeight = FontWeight.Bold,
                            color = CosmicTeal,
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(vertical = 8.dp)
                        )
                        Spacer(modifier = Modifier.height(8.dp))
                        
                        mistakesList.forEachIndexed { mIdx, q ->
                            Card(
                                colors = CardDefaults.cardColors(containerColor = Color.White),
                                shape = RoundedCornerShape(12.dp),
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .padding(bottom = 12.dp)
                                    .border(1.dp, Color(0xFFF1F5F9), RoundedCornerShape(12.dp))
                            ) {
                                Column(modifier = Modifier.padding(14.dp)) {
                                    Text(
                                        text = "${mIdx + 1}. " + q.question,
                                        fontSize = 13.sp,
                                        fontWeight = FontWeight.Bold,
                                        color = Color.Black
                                    )
                                    Spacer(modifier = Modifier.height(8.dp))
                                    Text(
                                        text = "Дұрыс жауап: " + q.getCorrectAnswer(),
                                        fontSize = 12.sp,
                                        color = Color(0xFF36A269),
                                        fontWeight = FontWeight.Bold
                                    )
                                }
                            }
                        }
                    }

                    Spacer(modifier = Modifier.height(24.dp))

                    Button(
                        onClick = onClose,
                        colors = ButtonDefaults.buttonColors(containerColor = CosmicTeal),
                        shape = RoundedCornerShape(10.dp),
                        modifier = Modifier
                            .fillMaxWidth()
                            .height(48.dp)
                    ) {
                        Text("Басты бетке қайту")
                    }
                    
                    Spacer(modifier = Modifier.height(16.dp))
                }
            }
        }
    }
}

// ==========================================
// SCREEN: ANKI FLASHCARDS
// ==========================================

@Composable
fun AnkiTab(
    onSelectDeck: (AnkiDeck) -> Unit
) {
    val decks = listOf(
        AnkiDeck("1916", "1916-1920 жылдар", "blocks-data/anki/history/1916-1920.json"),
        AnkiDeck("1920", "1920-1930 жылдар", "blocks-data/anki/history/1920-1930.json"),
        AnkiDeck("1930", "1930 жылдардағы тарих", "blocks-data/anki/history/1930.json"),
        AnkiDeck("1941", "1941-1945 Ұлы Отан соғысы", "blocks-data/anki/history/1941-1945.json"),
        AnkiDeck("1945", "1945-1985 Тоқырау жылдары", "blocks-data/anki/history/1945-85.json"),
        AnkiDeck("1991", "1991-2025 Тәуелсіз Қазақстан", "blocks-data/anki/history/1991-2025.json"),
        AnkiDeck("wow", "Тарихи фактілер жиынтығы", "blocks-data/anki/history/wow.json")
    )

    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(16.dp)
    ) {
        Text(
            text = "Anki Карточкалары",
            fontSize = 22.sp,
            fontWeight = FontWeight.Bold,
            color = CosmicTeal
        )
        Spacer(modifier = Modifier.height(4.dp))
        Text(
            text = "Аралық жылдар бойынша есте сақтау карточкалары арқылы жылдам жаттаңыз.",
            fontSize = 12.sp,
            color = Color.Gray
        )
        
        Spacer(modifier = Modifier.height(20.dp))

        LazyColumn(
            verticalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            items(decks) { deck ->
                ElevatedCard(
                    colors = CardDefaults.elevatedCardColors(containerColor = Color.White),
                    shape = RoundedCornerShape(14.dp),
                    modifier = Modifier
                        .fillMaxWidth()
                        .clickable { onSelectDeck(deck) }
                ) {
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(16.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Box(
                            modifier = Modifier
                                .size(44.dp)
                                .clip(RoundedCornerShape(8.dp))
                                .background(LightTealBg),
                            contentAlignment = Alignment.Center
                        ) {
                            Icon(
                                imageVector = Icons.Default.FilterNone,
                                contentDescription = null,
                                tint = CosmicTeal
                            )
                        }
                        Spacer(modifier = Modifier.width(14.dp))
                        Column(modifier = Modifier.weight(1f)) {
                            Text(
                                text = deck.title,
                                fontWeight = FontWeight.Bold,
                                color = Color.Black,
                                fontSize = 14.sp
                            )
                            Spacer(modifier = Modifier.height(2.dp))
                            Text(
                                text = "Қазақстан тарихы",
                                fontSize = 11.sp,
                                color = Color.Gray
                            )
                        }
                        Icon(
                            imageVector = Icons.Default.PlayArrow,
                            contentDescription = "Start",
                            tint = CosmicTeal
                        )
                    }
                }
            }
        }
    }
}

@Composable
fun AnkiRunnerView(
    deck: AnkiDeck,
    onClose: () -> Unit
) {
    val context = LocalContext.current
    var cardsList by remember { mutableStateOf<List<AnkiCard>>(emptyList()) }
    var loading by remember { mutableStateOf(true) }
    
    var currentIdx by remember { mutableStateOf(0) }
    var isFlipped by remember { mutableStateOf(false) }

    // Load deck JSON
    LaunchedEffect(deck) {
        withContext(Dispatchers.IO) {
            try {
                val jsonStr = loadAssetString(context, deck.file)
                val arr = JSONArray(jsonStr)
                val list = mutableListOf<AnkiCard>()
                for (i in 0 until arr.length()) {
                    val obj = arr.getJSONObject(i)
                    val front = obj.getString("front")
                    val back = obj.getString("back")
                    list.add(AnkiCard(i.toString(), front, back))
                }
                
                withContext(Dispatchers.Main) {
                    cardsList = list.shuffled() // Shuffle the deck on load!
                    loading = false
                }
            } catch (e: Exception) {
                Log.e("Anki", "Failed to load Anki cards", e)
                withContext(Dispatchers.Main) {
                    loading = false
                }
            }
        }
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text(deck.title, fontSize = 16.sp, fontWeight = FontWeight.Bold) },
                navigationIcon = {
                    IconButton(onClick = onClose) {
                        Icon(Icons.Default.ArrowBack, contentDescription = "Back")
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(containerColor = Color.White)
            )
        }
    ) { padding ->
        Box(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
                .background(SoftGray)
        ) {
            if (loading) {
                Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                    CircularProgressIndicator(color = CosmicTeal)
                }
            } else if (cardsList.isEmpty()) {
                Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                    Text("Карточкалар табылмады.", color = Color.Gray)
                }
            } else {
                val currentCard = cardsList[currentIdx]
                
                // Animated Card Flipping interpolation rotation Y
                val rotationY by animateFloatAsState(
                    targetValue = if (isFlipped) 180f else 0f,
                    animationSpec = tween(durationMillis = 400, easing = LinearOutSlowInEasing)
                )

                Column(
                    modifier = Modifier
                        .fillMaxSize()
                        .padding(20.dp),
                    horizontalAlignment = Alignment.CenterHorizontally,
                    verticalArrangement = Arrangement.SpaceBetween
                ) {
                    // Due/Remaining counter
                    Text(
                        text = "Карточка: ${currentIdx + 1} / ${cardsList.size}",
                        color = Color.Gray,
                        fontSize = 13.sp,
                        fontWeight = FontWeight.Bold
                    )

                    // Large flip card surface box
                    Box(
                        modifier = Modifier
                            .fillMaxWidth()
                            .weight(1f)
                            .padding(vertical = 24.dp)
                            .graphicsLayer {
                                this.rotationY = rotationY
                                cameraDistance = 12 * density
                            }
                            .clip(RoundedCornerShape(18.dp))
                            .background(Color.White)
                            .border(1.dp, Color(0xFFE2E8F0), RoundedCornerShape(18.dp))
                            .clickable { isFlipped = !isFlipped },
                        contentAlignment = Alignment.Center
                    ) {
                        if (rotationY < 90f) {
                            // FRONT FACE OF THE CARD
                            Column(
                                modifier = Modifier.padding(24.dp),
                                horizontalAlignment = Alignment.CenterHorizontally
                            ) {
                                Icon(Icons.Default.HelpOutline, contentDescription = null, tint = CosmicTeal, modifier = Modifier.size(36.dp))
                                Spacer(modifier = Modifier.height(18.dp))
                                Text(
                                    text = currentCard.front,
                                    fontSize = 18.sp,
                                    fontWeight = FontWeight.Bold,
                                    color = Color.Black,
                                    textAlign = TextAlign.Center,
                                    lineHeight = 24.sp
                                )
                                Spacer(modifier = Modifier.height(28.dp))
                                Text(
                                    text = "Аудару үшін түртіңіз",
                                    fontSize = 11.sp,
                                    color = Color.LightGray
                                )
                            }
                        } else {
                            // BACK FACE OF THE CARD (Rotated mirror text)
                            Column(
                                modifier = Modifier
                                    .graphicsLayer(rotationY = 180f) // correct mirror flip
                                    .padding(24.dp),
                                horizontalAlignment = Alignment.CenterHorizontally
                            ) {
                                Icon(Icons.Default.CheckCircleOutline, contentDescription = null, tint = Color(0xFF36A269), modifier = Modifier.size(36.dp))
                                Spacer(modifier = Modifier.height(18.dp))
                                Text(
                                    text = currentCard.back,
                                    fontSize = 20.sp,
                                    fontWeight = FontWeight.ExtraBold,
                                    color = Color(0xFF36A269),
                                    textAlign = TextAlign.Center,
                                    lineHeight = 26.sp
                                )
                            }
                        }
                    }

                    // Rating action controllers
                    if (!isFlipped) {
                        Button(
                            onClick = { isFlipped = true },
                            colors = ButtonDefaults.buttonColors(containerColor = CosmicTeal),
                            shape = RoundedCornerShape(10.dp),
                            modifier = Modifier
                                .fillMaxWidth()
                                .height(50.dp)
                        ) {
                            Text("Жауапты көрсету", fontWeight = FontWeight.Bold, fontSize = 15.sp)
                        }
                    } else {
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.spacedBy(16.dp)
                        ) {
                            Button(
                                onClick = {
                                    isFlipped = false
                                    if (currentIdx < cardsList.size - 1) currentIdx++ else currentIdx = 0
                                },
                                colors = ButtonDefaults.buttonColors(containerColor = AccentRed),
                                modifier = Modifier
                                    .weight(1f)
                                    .height(48.dp)
                            ) {
                                Text("Қайталау", color = Color.White)
                            }
                            Button(
                                onClick = {
                                    isFlipped = false
                                    if (currentIdx < cardsList.size - 1) currentIdx++ else onClose()
                                },
                                colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF36A269)),
                                modifier = Modifier
                                    .weight(1f)
                                    .height(48.dp)
                            ) {
                                Text("Оңай", color = Color.White)
                            }
                        }
                    }
                }
            }
        }
    }
}

// ==========================================
// SCREEN: STUDY BLOCKS
// ==========================================

@Composable
fun BlocksTab(
    onSelectTopic: (BlockTopic) -> Unit
) {
    val context = LocalContext.current
    var subjectsList by remember { mutableStateOf<List<BlockSubject>>(emptyList()) }
    var loading by remember { mutableStateOf(true) }

    LaunchedEffect(Unit) {
        withContext(Dispatchers.IO) {
            try {
                val catalogStr = loadAssetString(context, "blocks-data/catalog.json")
                val root = JSONObject(catalogStr)
                val subjectsArr = root.getJSONArray("subjects")
                val loaded = mutableListOf<BlockSubject>()
                for (i in 0 until subjectsArr.length()) {
                    val subObj = subjectsArr.getJSONObject(i)
                    val subId = subObj.getString("id")
                    val subTitle = subObj.getString("title")
                    
                    val topicsArr = subObj.getJSONArray("topics")
                    val topics = mutableListOf<BlockTopic>()
                    for (j in 0 until topicsArr.length()) {
                        val topicObj = topicsArr.getJSONObject(j)
                        topics.add(
                            BlockTopic(
                                id = topicObj.getString("id"),
                                code = topicObj.getString("code"),
                                title = topicObj.getString("title"),
                                summary = topicObj.optString("summary", "Оқу материалы."),
                                file = topicObj.getString("file")
                            )
                        )
                    }
                    loaded.add(BlockSubject(subId, subTitle, topics))
                }
                
                withContext(Dispatchers.Main) {
                    subjectsList = loaded
                    loading = false
                }
            } catch (e: Exception) {
                Log.e("Blocks", "Failed to load catalog.json", e)
                withContext(Dispatchers.Main) {
                    loading = false
                }
            }
        }
    }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(16.dp)
    ) {
        Text(
            text = "Оқу Блоктары",
            fontSize = 22.sp,
            fontWeight = FontWeight.Bold,
            color = CosmicTeal
        )
        Spacer(modifier = Modifier.height(4.dp))
        Text(
            text = "Блоктық теориялық материалдар мен конспекттерді тікелей оқыңыз.",
            fontSize = 12.sp,
            color = Color.Gray
        )
        
        Spacer(modifier = Modifier.height(18.dp))

        if (loading) {
            Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                CircularProgressIndicator(color = CosmicTeal)
            }
        } else {
            LazyColumn(
                verticalArrangement = Arrangement.spacedBy(16.dp)
            ) {
                items(subjectsList) { subject ->
                    Column {
                        Text(
                            text = subject.title,
                            fontWeight = FontWeight.Bold,
                            color = CosmicTeal,
                            fontSize = 16.sp,
                            modifier = Modifier.padding(bottom = 8.dp)
                        )
                        
                        subject.topics.forEach { topic ->
                            Card(
                                colors = CardDefaults.cardColors(containerColor = Color.White),
                                shape = RoundedCornerShape(12.dp),
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .padding(vertical = 4.dp)
                                    .border(1.dp, Color(0xFFE2E8F0), RoundedCornerShape(12.dp))
                                    .clickable { onSelectTopic(topic) }
                            ) {
                                Row(
                                    modifier = Modifier
                                        .fillMaxWidth()
                                        .padding(14.dp),
                                    verticalAlignment = Alignment.CenterVertically
                                ) {
                                    Box(
                                        modifier = Modifier
                                            .size(36.dp)
                                            .clip(RoundedCornerShape(6.dp))
                                            .background(LightTealBg),
                                        contentAlignment = Alignment.Center
                                    ) {
                                        Text(
                                            text = topic.code.replace("Блок ", ""),
                                            fontWeight = FontWeight.Bold,
                                            color = CosmicTeal,
                                            fontSize = 12.sp
                                        )
                                    }
                                    Spacer(modifier = Modifier.width(14.dp))
                                    Column(modifier = Modifier.weight(1f)) {
                                        Text(
                                            text = topic.title,
                                            fontWeight = FontWeight.Bold,
                                            color = Color.Black,
                                            fontSize = 13.sp
                                        )
                                        Spacer(modifier = Modifier.height(2.dp))
                                        Text(
                                            text = topic.summary,
                                            fontSize = 11.sp,
                                            color = Color.Gray,
                                            maxLines = 1,
                                            overflow = TextOverflow.Ellipsis
                                        )
                                    }
                                    Icon(
                                        imageVector = Icons.Default.MenuBook,
                                        contentDescription = "Read",
                                        tint = CosmicTeal,
                                        modifier = Modifier.size(20.dp)
                                    )
                                }
                            }
                        }
                    }
                }
            }
        }
    }
}

@Composable
fun BlockReaderView(
    topic: BlockTopic,
    onClose: () -> Unit
) {
    val context = LocalContext.current
    var docText by remember { mutableStateOf("") }
    var loading by remember { mutableStateOf(true) }

    // Load and parse Word document in background
    LaunchedEffect(topic) {
        withContext(Dispatchers.IO) {
            try {
                // Docx files are located at "blocks-data/docs/history/..." inside asset folder
                val relativePath = topic.file
                context.assets.open(relativePath).use { inputStream ->
                    val text = extractTextFromDocx(inputStream)
                    withContext(Dispatchers.Main) {
                        docText = text
                        loading = false
                    }
                }
            } catch (e: Exception) {
                Log.e("BlockReader", "Failed to load/parse docx file", e)
                withContext(Dispatchers.Main) {
                    docText = "Құжатты оқу мүмкін болмады: ${e.localizedMessage}"
                    loading = false
                }
            }
        }
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text(topic.title, fontSize = 16.sp, fontWeight = FontWeight.Bold) },
                navigationIcon = {
                    IconButton(onClick = onClose) {
                        Icon(Icons.Default.ArrowBack, contentDescription = "Back")
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(containerColor = Color.White)
            )
        }
    ) { padding ->
        Box(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
                .background(Color.White)
        ) {
            if (loading) {
                Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                    CircularProgressIndicator(color = CosmicTeal)
                }
            } else {
                Column(
                    modifier = Modifier
                        .fillMaxSize()
                        .padding(20.dp)
                        .verticalScroll(rememberScrollState())
                ) {
                    Text(
                        text = topic.code,
                        color = CosmicTeal,
                        fontWeight = FontWeight.Bold,
                        fontSize = 14.sp
                    )
                    Spacer(modifier = Modifier.height(4.dp))
                    Text(
                        text = topic.title,
                        fontSize = 20.sp,
                        fontWeight = FontWeight.Bold,
                        color = Color.Black
                    )
                    Spacer(modifier = Modifier.height(18.dp))
                    HorizontalDivider()
                    Spacer(modifier = Modifier.height(18.dp))
                    
                    // Display doc text
                    Text(
                        text = docText,
                        fontSize = 15.sp,
                        color = Color.Black,
                        lineHeight = 22.sp
                    )
                    Spacer(modifier = Modifier.height(48.dp))
                }
            }
        }
    }
}

// ==========================================
// SCREEN: FORMULAS SHEET
// ==========================================

@Composable
fun FormulasTab(
    onBack: () -> Unit
) {
    val formulas = listOf(
        Pair("Қысқаша көбейту", listOf(
            Pair("Квадрат қосындысы", "(a + b)² = a² + 2ab + b²"),
            Pair("Квадрат айырмасы", "(a - b)² = a² - 2ab + b²"),
            Pair("Айырма көбейтіндісі", "(a + b)(a - b) = a² - b²"),
            Pair("Куб қосындысы", "(a + b)³ = a³ + 3a²b + 3ab² + b³")
        )),
        Pair("Дәреже және түбір", listOf(
            Pair("Көбейту", "a^m • a^n = a^(m+n)"),
            Pair("Бөлу", "a^m / a^n = a^(m-n)"),
            Pair("Дәреженің дәрежесі", "(a^m)^n = a^mn"),
            Pair("Теріс дәреже", "a^-n = 1 / a^n")
        )),
        Pair("Логарифм негіздері", listOf(
            Pair("Негізгі мәндер", "log_a(1) = 0 , log_a(a) = 1"),
            Pair("Көбейтінді", "log_a(bc) = log_a(b) + log_a(c)"),
            Pair("Бөлінді", "log_a(b/c) = log_a(b) - log_a(c)"),
            Pair("Дәреже", "log_a(b^n) = n • log_a(b)")
        ))
    )

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Математика Формулалары", fontSize = 16.sp, fontWeight = FontWeight.Bold) },
                navigationIcon = {
                    IconButton(onClick = onBack) {
                        Icon(Icons.Default.ArrowBack, contentDescription = "Back")
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(containerColor = Color.White)
            )
        }
    ) { padding ->
        LazyColumn(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
                .padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(16.dp)
        ) {
            items(formulas) { section ->
                Column {
                    Text(
                        text = section.first,
                        fontWeight = FontWeight.Bold,
                        color = CosmicTeal,
                        fontSize = 16.sp,
                        modifier = Modifier.padding(bottom = 8.dp)
                    )
                    
                    section.second.forEach { item ->
                        Card(
                            colors = CardDefaults.cardColors(containerColor = Color.White),
                            shape = RoundedCornerShape(10.dp),
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(vertical = 4.dp)
                                .border(1.dp, Color(0xFFE2E8F0), RoundedCornerShape(10.dp))
                        ) {
                            Column(modifier = Modifier.padding(14.dp)) {
                                Text(item.first, fontWeight = FontWeight.Bold, fontSize = 13.sp, color = Color.Gray)
                                Spacer(modifier = Modifier.height(4.dp))
                                Text(item.second, fontFamily = FontFamily.Monospace, fontWeight = FontWeight.Bold, color = CosmicTeal, fontSize = 15.sp)
                            }
                        }
                    }
                }
            }
        }
    }
}

// ==========================================
// SCREEN: PROFILE & RANKING TAB
// ==========================================

@Composable
fun ProfileTab(
    user: UserProfile,
    testMode: String,
    onSetTestMode: (String) -> Unit,
    questionCount: Int,
    onSetQuestionCount: (Int) -> Unit,
    onLogout: () -> Unit
) {
    val context = LocalContext.current
    var activeSubTab by remember { mutableStateOf("profile") } // profile vs ranking
    var rankingList by remember { mutableStateOf<List<RankingEntry>>(emptyList()) }
    var rankingsLoading by remember { mutableStateOf(true) }

    // Load rankings data from assets
    LaunchedEffect(activeSubTab) {
        if (activeSubTab == "ranking" && rankingList.isEmpty()) {
            withContext(Dispatchers.IO) {
                try {
                    val rankingsStr = loadAssetString(context, "users/ranking.json")
                    val arr = JSONArray(rankingsStr)
                    val loaded = mutableListOf<RankingEntry>()
                    for (i in 0 until arr.length()) {
                        val obj = arr.getJSONObject(i)
                        
                        val historyList = mutableListOf<Int>()
                        val hArr = obj.optJSONArray("totalHistory")
                        if (hArr != null) {
                            for (k in 0 until hArr.length()) {
                                historyList.add(hArr.getInt(k))
                            }
                        }
                        
                        loaded.add(
                            RankingEntry(
                                name = obj.getString("name"),
                                avatar = obj.getString("avatar"),
                                score = obj.getInt("score"),
                                totalHistory = historyList,
                                type = obj.optString("type", "ҰБТ")
                            )
                        )
                    }
                    withContext(Dispatchers.Main) {
                        rankingList = loaded.sortedByDescending { it.score }
                        rankingsLoading = false
                    }
                } catch (e: Exception) {
                    Log.e("Ranking", "Failed to load ranking.json", e)
                    withContext(Dispatchers.Main) {
                        rankingsLoading = false
                    }
                }
            }
        }
    }

    Column(modifier = Modifier.fillMaxSize()) {
        // Sub-tabs at the top
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .background(Color.White)
                .padding(vertical = 12.dp)
        ) {
            Box(
                modifier = Modifier
                    .weight(1f)
                    .clickable { activeSubTab = "profile" },
                contentAlignment = Alignment.Center
            ) {
                Column(horizontalAlignment = Alignment.CenterHorizontally) {
                    Text(
                        "Жеке кабинет",
                        fontWeight = FontWeight.Bold,
                        color = if (activeSubTab == "profile") CosmicTeal else Color.Gray,
                        fontSize = 15.sp
                    )
                    Spacer(modifier = Modifier.height(4.dp))
                    if (activeSubTab == "profile") {
                        Box(modifier = Modifier.size(40.dp, 3.dp).background(CosmicTeal))
                    }
                }
            }
            Box(
                modifier = Modifier
                    .weight(1f)
                    .clickable { activeSubTab = "ranking" },
                contentAlignment = Alignment.Center
            ) {
                Column(horizontalAlignment = Alignment.CenterHorizontally) {
                    Text(
                        "Рейтинг",
                        fontWeight = FontWeight.Bold,
                        color = if (activeSubTab == "ranking") CosmicTeal else Color.Gray,
                        fontSize = 15.sp
                    )
                    Spacer(modifier = Modifier.height(4.dp))
                    if (activeSubTab == "ranking") {
                        Box(modifier = Modifier.size(40.dp, 3.dp).background(CosmicTeal))
                    }
                }
            }
        }

        Box(modifier = Modifier.fillMaxSize()) {
            if (activeSubTab == "profile") {
                // PROFILE CONTENT
                LazyColumn(
                    modifier = Modifier
                        .fillMaxSize()
                        .padding(16.dp),
                    verticalArrangement = Arrangement.spacedBy(16.dp)
                ) {
                    // Profile Header card
                    item {
                        ElevatedCard(
                            colors = CardDefaults.elevatedCardColors(containerColor = Color.White),
                            shape = RoundedCornerShape(16.dp),
                            modifier = Modifier.fillMaxWidth()
                        ) {
                            Column(
                                modifier = Modifier.padding(20.dp),
                                horizontalAlignment = Alignment.CenterHorizontally
                            ) {
                                Box(
                                    modifier = Modifier
                                        .size(80.dp)
                                        .clip(CircleShape)
                                        .background(LightTealBg),
                                    contentAlignment = Alignment.Center
                                ) {
                                    // Load user avatar or School icon fallback
                                    if (user.avatar.isNotEmpty()) {
                                        AsyncImage(
                                            model = "file:///android_asset/${user.avatar}",
                                            contentDescription = "Avatar",
                                            modifier = Modifier.fillMaxSize()
                                        )
                                    } else {
                                        Icon(
                                            imageVector = Icons.Default.Person,
                                            contentDescription = null,
                                            tint = CosmicTeal,
                                            modifier = Modifier.size(44.dp)
                                        )
                                    }
                                }
                                Spacer(modifier = Modifier.height(12.dp))
                                Text(user.name, fontWeight = FontWeight.Bold, fontSize = 18.sp, color = Color.Black)
                                Spacer(modifier = Modifier.height(4.dp))
                                Text("Жалпы нәтижесі: ${user.score} ұпай", color = CosmicTeal, fontWeight = FontWeight.Bold, fontSize = 13.sp)
                            }
                        }
                    }

                    // Settings options title
                    item {
                        Text(
                            text = "Баптаулар",
                            fontWeight = FontWeight.Bold,
                            color = CosmicTeal,
                            fontSize = 16.sp
                        )
                    }

                    // Settings parameters
                    item {
                        ElevatedCard(
                            colors = CardDefaults.elevatedCardColors(containerColor = Color.White),
                            shape = RoundedCornerShape(14.dp),
                            modifier = Modifier.fillMaxWidth()
                        ) {
                            Column(modifier = Modifier.padding(16.dp)) {
                                Text("Тест тапсыру режимі", fontWeight = FontWeight.Bold, fontSize = 13.sp, color = Color.Gray)
                                Spacer(modifier = Modifier.height(8.dp))
                                
                                val modes = listOf(
                                    Pair("exam", "Еркін режим"),
                                    Pair("instant", "Қазіргі режим"),
                                    Pair("self-check", "Түртіп оқу")
                                )
                                modes.forEach { (m, name) ->
                                    Row(
                                        modifier = Modifier
                                            .fillMaxWidth()
                                            .clickable { onSetTestMode(m) }
                                            .padding(vertical = 8.dp),
                                        verticalAlignment = Alignment.CenterVertically
                                    ) {
                                        RadioButton(
                                            selected = testMode == m,
                                            onClick = { onSetTestMode(m) },
                                            colors = RadioButtonDefaults.colors(selectedColor = CosmicTeal)
                                        )
                                        Spacer(modifier = Modifier.width(8.dp))
                                        Text(name, fontSize = 14.sp)
                                    }
                                }
                            }
                        }
                    }

                    item {
                        ElevatedCard(
                            colors = CardDefaults.elevatedCardColors(containerColor = Color.White),
                            shape = RoundedCornerShape(14.dp),
                            modifier = Modifier.fillMaxWidth()
                        ) {
                            Column(modifier = Modifier.padding(16.dp)) {
                                Text("Тесттегі сұрақ саны", fontWeight = FontWeight.Bold, fontSize = 13.sp, color = Color.Gray)
                                Spacer(modifier = Modifier.height(8.dp))
                                
                                val counts = listOf(20, 30, 40, 60)
                                Row(
                                    modifier = Modifier.fillMaxWidth(),
                                    horizontalArrangement = Arrangement.SpaceBetween
                                ) {
                                    counts.forEach { c ->
                                        val isSelected = questionCount == c
                                        Box(
                                            modifier = Modifier
                                                .clip(RoundedCornerShape(8.dp))
                                                .background(if (isSelected) CosmicTeal else Color(0xFFF1F5F9))
                                                .clickable { onSetQuestionCount(c) }
                                                .padding(horizontal = 14.dp, vertical = 10.dp),
                                            contentAlignment = Alignment.Center
                                        ) {
                                            Text(
                                                text = "$c",
                                                color = if (isSelected) Color.White else CosmicTeal,
                                                fontWeight = FontWeight.Bold,
                                                fontSize = 14.sp
                                            )
                                        }
                                    }
                                }
                            }
                        }
                    }

                    // Logout Button
                    item {
                        Button(
                            onClick = onLogout,
                            colors = ButtonDefaults.buttonColors(containerColor = AccentRed),
                            shape = RoundedCornerShape(10.dp),
                            modifier = Modifier
                                .fillMaxWidth()
                                .height(48.dp)
                        ) {
                            Text("Жүйеден шығу", color = Color.White, fontWeight = FontWeight.Bold)
                        }
                    }
                    
                    item { Spacer(modifier = Modifier.height(16.dp)) }
                }
            } else {
                // RANKING CONTENT
                if (rankingsLoading) {
                    Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                        CircularProgressIndicator(color = CosmicTeal)
                    }
                } else {
                    LazyColumn(
                        modifier = Modifier
                            .fillMaxSize()
                            .padding(16.dp),
                        verticalArrangement = Arrangement.spacedBy(10.dp)
                    ) {
                        itemsIndexed(rankingList) { index, student ->
                            val isCurrentUser = student.name.contains(user.name.take(4)) || (user.id == "guest_demo" && student.name == "Абдилла Саян")
                            val cardBorderColor = if (isCurrentUser) CosmicTeal else Color.Transparent
                            
                            Card(
                                colors = CardDefaults.cardColors(containerColor = if (isCurrentUser) LightTealBg else Color.White),
                                shape = RoundedCornerShape(12.dp),
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .border(1.dp, if (isCurrentUser) CosmicTeal else Color(0xFFE2E8F0), RoundedCornerShape(12.dp))
                            ) {
                                Row(
                                    modifier = Modifier
                                        .fillMaxWidth()
                                        .padding(14.dp),
                                    verticalAlignment = Alignment.CenterVertically
                                ) {
                                    // Rank Number Badge
                                    Box(
                                        modifier = Modifier
                                            .size(28.dp)
                                            .clip(CircleShape)
                                            .background(
                                                when (index) {
                                                    0 -> AccentOrange
                                                    1 -> Color.LightGray
                                                    2 -> Color(0xFFC47E5A)
                                                    else -> Color(0xFFE2E8F0)
                                                }
                                            ),
                                        contentAlignment = Alignment.Center
                                    ) {
                                        Text(
                                            text = "${index + 1}",
                                            fontWeight = FontWeight.Bold,
                                            color = if (index <= 2) Color.White else Color.Black,
                                            fontSize = 12.sp
                                        )
                                    }
                                    Spacer(modifier = Modifier.width(12.dp))
                                    
                                    // Student Avatar
                                    Box(
                                        modifier = Modifier
                                            .size(36.dp)
                                            .clip(CircleShape)
                                            .background(Color.White)
                                    ) {
                                        AsyncImage(
                                            model = "file:///android_asset/${student.avatar}",
                                            contentDescription = student.name,
                                            modifier = Modifier.fillMaxSize()
                                        )
                                    }
                                    Spacer(modifier = Modifier.width(14.dp))
                                    
                                    // Name
                                    Column(modifier = Modifier.weight(1f)) {
                                        Text(
                                            text = student.name,
                                            fontWeight = FontWeight.Bold,
                                            color = Color.Black,
                                            fontSize = 14.sp
                                        )
                                        Text(
                                            text = student.type,
                                            fontSize = 10.sp,
                                            color = Color.Gray
                                        )
                                    }
                                    
                                    // Score
                                    Text(
                                        text = "${student.score} ұпай",
                                        fontWeight = FontWeight.Bold,
                                        color = CosmicTeal,
                                        fontSize = 14.sp
                                    )
                                }
                            }
                        }
                    }
                }
            }
        }
    }
}
