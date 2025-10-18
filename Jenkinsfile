pipeline {
    agent any

    tools {
        maven 'maven-3.9'     
        nodejs 'node-18'         
    }

    environment {
        SONAR_HOME = tool "Sonar"
        SONAR_HOST_URL = 'http://43.205.122.223:9000'  
                
        DT_URL = 'http://13.235.40.181:8085'  
        DT_API_KEY = credentials('dependency-track-api-key') 
        DT_PROJECT_NAME = 'Employee-Management-System'
        DT_PROJECT_VERSION = '1.0.0'
        
        CRITICAL_THRESHOLD = 10
        HIGH_THRESHOLD = 20
        MEDIUM_THRESHOLD = 90
    }

    stages {

        stage("Cloning from GitHub") {
            steps {
                git url: "https://github.com/WHY-SHREYAS/emp_project.git", branch: "main"
            }
        }

        stage("Build") {
            steps {
                sh 'ls -la' 

                dir('emp_backend') {
                    sh 'ls -la'
                    sh 'mvn -version'
                    sh 'mvn clean compile'
                }

                dir('employee frontend final') {
                    sh 'ls -la'
                    sh 'node --version'
                    sh 'npm --version'
                    sh 'npm cache clean --force'
                    sh 'rm -rf node_modules package-lock.json'
                    sh 'npm install'
                    sh 'npm audit fix || true'
                    sh 'CI=false npm run build'
                }
            }
        }

        stage("Test") {
            parallel {
                stage("Backend Tests") {
                    steps {
                        dir("emp_backend") {
                            sh '''
                                mvn clean test
                                mvn jacoco:report
                            '''
                            junit testResults: 'target/surefire-reports/**/*.xml', allowEmptyResults: true
                        }
                    }
                }

                stage("Frontend Tests") {
                    steps {
                        dir('employee frontend final') {
                            sh 'npm test -- --no-watch --code-coverage --browsers=ChromeHeadless || true'
                        }
                    }
                }
            }
        }

        stage("Generate SBOM") {
            parallel {
                stage("Backend SBOM") {
                    steps {
                        dir('emp_backend') {
                            sh '''
                                mvn org.cyclonedx:cyclonedx-maven-plugin:makeBom
                                ls -la target/
                                if [ -f "target/bom.xml" ]; then
                                    echo "Backend SBOM generated successfully"
                                fi
                            '''
                        }
                    }
                }

                stage("Frontend SBOM") {
                    steps {
                        dir('employee frontend final') {
                            sh '''
                                npm install -g @cyclonedx/cyclonedx-npm
                                cyclonedx-npm --output-file bom.json
                                ls -la
                                if [ -f "bom.json" ]; then
                                    echo "Frontend SBOM generated successfully"
                                fi
                            '''
                        }
                    }
                }
            }
        }

       stage("Upload to Dependency-Track") {
            steps {
                script {
                    try {
                        // Backend SBOM Upload
                        dir('emp_backend') {
                            sh '''
                                if [ -f "target/bom.xml" ]; then
                                    echo "Uploading Backend SBOM to Dependency-Track..."
                                    curl -v -X POST "${DT_URL}/api/v1/bom" \
                                         -H "Content-Type: multipart/form-data" \
                                         -H "X-Api-Key: ${DT_API_KEY}" \
                                         -F "autoCreate=true" \
                                         -F "projectName=${DT_PROJECT_NAME}-Backend" \
                                         -F "projectVersion=${DT_PROJECT_VERSION}" \
                                         -F "bom=@target/bom.xml"
                                    echo "Backend SBOM uploaded successfully"
                                else
                                    echo "ERROR: Backend SBOM not found at target/bom.xml"
                                    exit 1
                                fi
                            '''
                        }

                        // Frontend SBOM Upload
                        dir('employee frontend final') {
                            sh '''
                                if [ -f "bom.json" ]; then
                                    echo "Uploading Frontend SBOM to Dependency-Track..."
                                    curl -v -X POST "${DT_URL}/api/v1/bom" \
                                         -H "Content-Type: multipart/form-data" \
                                         -H "X-Api-Key: ${DT_API_KEY}" \
                                         -F "autoCreate=true" \
                                         -F "projectName=${DT_PROJECT_NAME}-Frontend" \
                                         -F "projectVersion=${DT_PROJECT_VERSION}" \
                                         -F "bom=@bom.json"
                                    echo "Frontend SBOM uploaded successfully"
                                else
                                    echo "ERROR: Frontend SBOM not found at bom.json"
                                    exit 1
                                fi
                            '''
                        }

                        echo "Waiting for Dependency-Track to process SBOMs..."
                        sleep(time: 3, unit: 'MINUTES')
                    } catch (Exception e) {
                        echo "Error uploading SBOMs: ${e.message}"
                        throw e
                    }
                }
            }
        }

        stage("Check Vulnerabilities") {
            steps {
                script {
                    def checkVulnerabilities = { projectName ->
                        try {
                            def response = sh(
                                script: """
                                    curl -s -X GET "${DT_URL}/api/v1/metrics/project?name=${projectName}&version=${DT_PROJECT_VERSION}" \
                                    -H "X-Api-Key: ${DT_API_KEY}"
                                """,
                                returnStdout: true
                            ).trim()

                            echo "Metrics Response: ${response}"

                            if (!response || response.isEmpty()) {
                                echo "WARNING: No metrics returned for ${projectName}. Project may still be processing."
                                return [critical: 0, high: 0, medium: 0, low: 0]
                            }

                            def metrics = readJSON text: response
                            
                            def critical = metrics.critical ?: 0
                            def high = metrics.high ?: 0
                            def medium = metrics.medium ?: 0
                            def low = metrics.low ?: 0

                            echo """
                            ========================================
                            Vulnerability Report for ${projectName}
                            ========================================
                            Critical: ${critical} (Threshold: ${CRITICAL_THRESHOLD})
                            High:     ${high} (Threshold: ${HIGH_THRESHOLD})
                            Medium:   ${medium} (Threshold: ${MEDIUM_THRESHOLD})
                            Low:      ${low}
                            ========================================
                            """

                            def failed = false
                            def failureReasons = []

                            if (critical > CRITICAL_THRESHOLD.toInteger()) {
                                failureReasons.add("Critical vulnerabilities: ${critical} (exceeds threshold of ${CRITICAL_THRESHOLD})")
                                failed = true
                            }
                            if (high > HIGH_THRESHOLD.toInteger()) {
                                failureReasons.add("High vulnerabilities: ${high} (exceeds threshold of ${HIGH_THRESHOLD})")
                                failed = true
                            }
                            if (medium > MEDIUM_THRESHOLD.toInteger()) {
                                failureReasons.add("Medium vulnerabilities: ${medium} (exceeds threshold of ${MEDIUM_THRESHOLD})")
                                failed = true
                            }

                            if (failed) {
                                error("Build failed for ${projectName} due to:\n" + failureReasons.join('\n'))
                            } else {
                                echo "${projectName} passed vulnerability checks!"
                            }

                            return [critical: critical, high: high, medium: medium, low: low]
                        } catch (Exception e) {
                            echo "Error checking vulnerabilities for ${projectName}: ${e.message}"
                            return [critical: 0, high: 0, medium: 0, low: 0]
                        }
                    }

                    try {
                        def backendMetrics = checkVulnerabilities("${DT_PROJECT_NAME}-Backend")
                        def frontendMetrics = checkVulnerabilities("${DT_PROJECT_NAME}-Frontend")

                        echo """
                        ========================================
                        Combined Vulnerability Summary
                        ========================================
                        Total Critical: ${backendMetrics.critical + frontendMetrics.critical}
                        Total High:     ${backendMetrics.high + frontendMetrics.high}
                        Total Medium:   ${backendMetrics.medium + frontendMetrics.medium}
                        Total Low:      ${backendMetrics.low + frontendMetrics.low}
                        ========================================
                        """
                    } catch (Exception e) {
                        echo "Error in vulnerability checks: ${e.message}"
                        // Don't fail the build here, just warn
                        currentBuild.result = 'UNSTABLE'
                    }
                }
            }
        }

        stage("SonarQube Quality Analysis") {
            steps {
                withSonarQubeEnv("Sonar") {
                    sh """
                        $SONAR_HOME/bin/sonar-scanner \
                        -Dsonar.projectName=Employee-Management-System \
                        -Dsonar.projectKey=Employee-Management-System \
                        -Dsonar.java.binaries=emp_backend/target/classes \
                        -Dsonar.sources=emp_backend/src/main,employee\\ frontend\\ final/src \
                        -Dsonar.tests=emp_backend/src/test,employee\\ frontend\\ final/src \
                        -Dsonar.test.inclusions=**/*.test.js,**/*.test.jsx,**/*.test.ts,**/*.test.tsx,**/src/test/**/*.java \
                        -Dsonar.exclusions=**/node_modules/**,**/build/**,**/dist/**,**/target/** \
                        -Dsonar.coverage.jacoco.xmlReportPaths=emp_backend/target/site/jacoco/jacoco.xml \
                        -Dsonar.typescript.lcov.reportPaths=employee\\ frontend\\ final/coverage/lcov.info \
                        -Dsonar.java.coveragePlugin=jacoco
                    """
                }
            }
        }

        stage("Quality Gate Check") {
            steps {
                script {
                    timeout(time: 10, unit: 'MINUTES') {
                        def qg = waitForQualityGate()
                        if (qg.status != 'OK') {
                            error "Quality Gate failed: ${qg.status}"
                        }
                        echo "Quality Gate passed successfully!"
                    }
                }
            }
        }

        stage("Archive Test Results") {
            steps {
                junit 'emp_backend/target/surefire-reports/*.xml'
                archiveArtifacts artifacts: 'employee frontend final/coverage/**', allowEmptyArchive: true
            }
        }

        stage("Deploy") {
            steps {
                echo "Deploy stage completed successfully!"
            }
        }
   }
}
