package org.alex.everyWeb.modules.impl.torrent;

import org.alex.everyWeb.modules.impl.torrent.dto.TorrentDTO;
import org.alex.everyWeb.modules.impl.torrent.dto.TorrentFileDTO;
import org.alex.everyWeb.modules.impl.torrent.dto.TorrentPropertiesDTO;
import org.alex.everyWeb.modules.impl.torrent.dto.TorrentTrackerDTO;
import org.alex.everyWeb.modules.impl.torrent.dto.TorrentPeerDTO;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Бизнес-логика торрент-виджета.
 *
 * Паттерн как в NextcloudService: принимает все параметры подключения явно,
 * не знает про moduleId. Кэширует QbittorrentClient по ключу
 * baseUrl|username|password, чтобы не пересоздавать WebClient каждый запрос.
 */
@Service
public class TorrentService {

    private static final Logger log = LoggerFactory.getLogger(TorrentService.class);

    private final Map<String, QbittorrentClient> clients = new ConcurrentHashMap<>();

    public TorrentService() {
    }

    /**
     * Получить (или создать) клиент под заданные параметры.
     */
    public QbittorrentClient getClient(TorrentData data) {
        if (data == null || !data.isConfigured()) {
            return null;
        }
        String key = data.getBaseUrl() + "|" + data.getUsername() + "|" + data.getPassword();

        QbittorrentClient existing = clients.get(key);
        if (existing != null) {
            return existing;
        }

        QbittorrentClient client = new QbittorrentClient();
        client.configure(data.getBaseUrl(), data.getUsername(), data.getPassword());
        boolean ok = client.login();
        if (!ok) {
            // Не кэшируем неудачный клиент — при следующем вызове попробуем снова
            // (но backoff внутри клиента не даст бана)
            return client;
        }
        clients.put(key, client);
        return client;
    }

    public QbittorrentClient forceReconnect(TorrentData data) {
        if (data == null || !data.isConfigured()) {
            return null;
        }
        String key = data.getBaseUrl() + "|" + data.getUsername() + "|" + data.getPassword();

        // Удаляем старый клиент
        clients.remove(key);

        // Создаём новый
        QbittorrentClient client = new QbittorrentClient();
        client.configure(data.getBaseUrl(), data.getUsername(), data.getPassword());
        client.login();
        clients.put(key, client);

        log.info("TorrentService: принудительное пересоздание клиента для {}", data.getBaseUrl());
        return client;
    }

    /**
     * Сбросить клиент (при смене настроек).
     */
    public void invalidate(TorrentData data) {
        if (data == null) return;
        String key = data.getBaseUrl() + "|" + data.getUsername() + "|" + data.getPassword();
        QbittorrentClient removed = clients.remove(key);
        if (removed != null) {
            log.info("TorrentService: клиент сброшен для {}", data.getBaseUrl());
        }
    }

    // ===== ПУБЛИЧНЫЕ МЕТОДЫ =====

    public boolean ping(TorrentData data) {
        QbittorrentClient client = getClient(data);
        return client != null && client.ping();
    }

    public String getVersion(TorrentData data) {
        QbittorrentClient client = getClient(data);
        return client == null ? null : client.getVersion();
    }

    public List<TorrentDTO> list(TorrentData data) {
        QbittorrentClient client = getClient(data);
        return client == null ? List.of() : client.getTorrents();
    }

    public List<TorrentFileDTO> files(TorrentData data, String hash) {
        QbittorrentClient client = getClient(data);
        return client == null ? List.of() : client.getTorrentFiles(hash);
    }

    public TorrentPropertiesDTO properties(TorrentData data, String hash) {
        QbittorrentClient client = getClient(data);
        return client == null ? null : client.getTorrentProperties(hash);
    }

    public boolean pause(TorrentData data, String hash) {
        QbittorrentClient client = getClient(data);
        return client != null && client.pause(hash);
    }

    public boolean resume(TorrentData data, String hash) {
        QbittorrentClient client = getClient(data);
        return client != null && client.resume(hash);
    }

    public boolean delete(TorrentData data, String hash, boolean deleteFiles) {
        QbittorrentClient client = getClient(data);
        return client != null && client.delete(hash, deleteFiles);
    }

    public boolean add(TorrentData data, String url, String savePath, String category,
                       Boolean sequential, Boolean firstLast) {
        QbittorrentClient client = getClient(data);
        if (client == null) return false;
        // если savePath не задан — используем downloadPath
        String target = (savePath == null || savePath.isBlank())
                ? data.getDownloadPath()
                : savePath;
        return client.addTorrent(url, target, category, sequential, firstLast);
    }

    public boolean toggleSequential(TorrentData data, String hash) {
        QbittorrentClient client = getClient(data);
        return client != null && client.toggleSequentialDownload(hash);
    }

    public boolean toggleFirstLast(TorrentData data, String hash) {
        QbittorrentClient client = getClient(data);
        return client != null && client.toggleFirstLastPiecePrio(hash);
    }

    public boolean setFilePriority(TorrentData data, String hash, int[] fileIds, int priority) {
        QbittorrentClient client = getClient(data);
        return client != null && client.setFilePriority(hash, fileIds, priority);
    }

    /**
     * Переключить режим лимитов скорости (0 ⇄ 1).
     */
    public boolean toggleSpeedLimitsMode(TorrentData data) {
        QbittorrentClient client = getClient(data);
        return client != null && client.toggleSpeedLimitsMode();
    }

    /**
     * Текущий режим: 0 = обычные (без лимитов), 1 = альтернативные (медленные).
     */
    public int getSpeedLimitsMode(TorrentData data) {
        QbittorrentClient client = getClient(data);
        return client == null ? -1 : client.getSpeedLimitsMode();
    }

    /**
     * Transfer/info — скорости, лимиты, статус соединения.
     */
    public com.fasterxml.jackson.databind.JsonNode transferInfo(TorrentData data) {
        QbittorrentClient client = getClient(data);
        return client == null ? null : client.getTransferInfo();
    }

    /**
     * Получить торрент по хэшу из списка.
     */
    public TorrentDTO findTorrent(TorrentData data, String hash) {
        List<TorrentDTO> all = list(data);
        for (TorrentDTO t : all) {
            if (t.getHash() != null && t.getHash().equalsIgnoreCase(hash)) {
                return t;
            }
        }
        return null;
    }

    public List<TorrentTrackerDTO> trackers(TorrentData data, String hash) {
        QbittorrentClient client = getClient(data);
        return client == null ? List.of() : client.getTrackers(hash);
    }

    public List<TorrentPeerDTO> peers(TorrentData data, String hash) {
        QbittorrentClient client = getClient(data);
        return client == null ? List.of() : client.getPeers(hash);
    }

    public boolean reannounce(TorrentData data, String hash) {
        QbittorrentClient client = getClient(data);
        return client != null && client.reannounce(hash);
    }

    /**
     * Установить режим лимитов скорости: true = медленный (альтернативный), false = безлимит.
     */
    public boolean setSpeedLimitsMode(TorrentData data, boolean slowMode) {
        QbittorrentClient client = getClient(data);
        if (client == null) return false;
        int current = client.getSpeedLimitsMode();
        if (current < 0) return false;
        // 0 = обычные (безлимит), 1 = альтернативные (медленные)
        int desired = slowMode ? 1 : 0;
        if (current == desired) return true; // уже в нужном режиме
        return client.toggleSpeedLimitsMode();
    }

    public boolean addTorrentFile(TorrentData data, byte[] fileBytes, String fileName,
                                  String savePath, String category,
                                  Boolean sequential, Boolean firstLast) {
        QbittorrentClient client = getClient(data);
        if (client == null) return false;
        String target = (savePath == null || savePath.isBlank())
                ? data.getDownloadPath()
                : savePath;
        return client.addTorrentFile(fileBytes, fileName, target, category, sequential, firstLast);
    }
}