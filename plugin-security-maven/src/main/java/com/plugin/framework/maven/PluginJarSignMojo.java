package com.plugin.framework.maven;

import java.io.File;
import java.io.IOException;
import java.io.InputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardCopyOption;
import java.util.Objects;
import java.util.Properties;
import java.util.jar.JarEntry;
import java.util.jar.JarFile;

import io.github.extend.plugin.core.runtime.PluginMetadata;
import io.github.extend.plugin.core.security.PluginSecurityUtil;
import org.apache.maven.plugin.AbstractMojo;
import org.apache.maven.plugin.MojoExecutionException;
import org.apache.maven.plugins.annotations.LifecyclePhase;
import org.apache.maven.plugins.annotations.Mojo;
import org.apache.maven.plugins.annotations.Parameter;
import org.apache.maven.project.MavenProject;

/**
 * 在打包阶段为插件 Jar 生成安全文件名的 Maven 插件。
 */
@Mojo(name = "sign-jar", defaultPhase = LifecyclePhase.PACKAGE, threadSafe = true)
public class PluginJarSignMojo extends AbstractMojo {

    private static final String DEFAULT_PROPERTIES_PATH = "META-INF/plugin.properties";

    @Parameter(defaultValue = "${project}", readonly = true, required = true)
    private MavenProject project;

    @Parameter(property = "plugin.security.secret")
    private String secret;

    @Parameter(property = "plugin.security.nonceLength", defaultValue = "8")
    private int nonceLength;

    @Parameter(property = "plugin.security.tokenLength", defaultValue = "24")
    private int tokenLength;

    @Parameter(property = "plugin.security.propertiesPath", defaultValue = DEFAULT_PROPERTIES_PATH)
    private String propertiesPath;

    @Parameter(property = "plugin.security.configFile", defaultValue = "${project.basedir}/plugin-security.properties")
    private File configFile;

    @Override
    public void execute() throws MojoExecutionException {
        Objects.requireNonNull(project, "project");
        resolveSecretIfNecessary();
        File artifactFile = project.getArtifact().getFile();
        if (artifactFile == null || !artifactFile.isFile()) {
            getLog().info("no artifact jar to sign, skip");
            return;
        }
        Path jarPath = artifactFile.toPath();
        PluginMetadata metadata = loadMetadata(jarPath);
        if (metadata == null || !metadata.hasValidId()) {
            throw new MojoExecutionException(
                    "failed to load plugin metadata from jar: " + jarPath);
        }
        String fileName =
                PluginSecurityUtil.generateSecureFileName(
                        metadata.getId(),
                        metadata.getName(),
                        metadata.getVersion(),
                        secret,
                        nonceLength,
                        tokenLength);
        Path target = jarPath.getParent().resolve(fileName);
        try {
            Files.move(jarPath, target, StandardCopyOption.REPLACE_EXISTING);
        } catch (IOException e) {
            throw new MojoExecutionException(
                    "failed to rename plugin jar to secure name: " + target,
                    e);
        }
        project.getArtifact().setFile(target.toFile());
        getLog()
                .info(
                        "plugin jar signed with secure name: "
                                + target.getFileName());
    }

    private PluginMetadata loadMetadata(Path jar) throws MojoExecutionException {
        try (JarFile jarFile = new JarFile(jar.toFile())) {
            JarEntry entry = jarFile.getJarEntry(propertiesPath);
            if (entry == null) {
                getLog()
                        .warn(
                                "plugin metadata file "
                                        + propertiesPath
                                        + " not found in jar: "
                                        + jar);
                return null;
            }
            Properties properties = new Properties();
            try (InputStream inputStream = jarFile.getInputStream(entry)) {
                properties.load(inputStream);
            }
            return PluginMetadata.fromProperties(properties);
        } catch (IOException e) {
            throw new MojoExecutionException(
                    "failed to load plugin metadata from jar: " + jar,
                    e);
        }
    }

    private void resolveSecretIfNecessary() throws MojoExecutionException {
        if (secret != null && !secret.isEmpty()) {
            return;
        }
        String envSecret = System.getenv("PLUGIN_SECURITY_SECRET");
        if (envSecret != null && !envSecret.isEmpty()) {
            secret = envSecret;
            return;
        }
        if (configFile != null && configFile.isFile()) {
            Properties properties = new Properties();
            try (InputStream inputStream = Files.newInputStream(configFile.toPath())) {
                properties.load(inputStream);
            } catch (IOException e) {
                throw new MojoExecutionException(
                        "failed to load plugin security config file: " + configFile,
                        e);
            }
            String value = properties.getProperty("plugin.security.secret");
            if (value != null && !value.isEmpty()) {
                secret = value;
            }
        }
        if (secret == null || secret.isEmpty()) {
            throw new MojoExecutionException(
                    "plugin.security.secret must not be empty, please configure it via "
                            + "plugin-security.properties or -Dplugin.security.secret");
        }
    }
}

